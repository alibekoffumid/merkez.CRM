// server/src/routes/dental.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function dentalRoutes(fastify, options) {
  
  // Middleware to check for DENTIST or ADMIN role
  fastify.addHook('preHandler', async (request, reply) => {
    const { user } = request; // Assuming user is attached by an auth plugin
    if (!user || (user.role.toUpperCase() !== 'DENTIST' && user.role.toUpperCase() !== 'ADMIN')) {
      return reply.code(403).send({ error: 'Access restricted to medical personnel.' });
    }
  });

  /**
   * Complete an appointment and decrement inventory items
   * Uses a database transaction to ensure integrity
   */
  fastify.post('/appointments/:id/complete', async (request, reply) => {
    const { id } = request.params;

    try {
      const result = await prisma.$transaction(async (tx) => {
        // 1. Get the appointment and its procedures
        const appointment = await tx.appointment.findUnique({
          where: { id },
          include: {
            procedures: {
              include: {
                materials: true
              }
            }
          }
        });

        if (!appointment) {
          throw new Error('Appointment not found');
        }

        if (appointment.status === 'COMPLETED') {
          throw new Error('Appointment already completed');
        }

        // 2. Update appointment status
        const updatedAppointment = await tx.appointment.update({
          where: { id },
          data: { status: 'COMPLETED' }
        });

        // 3. Process inventory for each procedure
        for (const procedure of appointment.procedures) {
          for (const material of procedure.materials) {
            // Decrement the inventory item quantity
            const inventoryItem = await tx.inventoryItem.update({
              where: { id: material.itemId },
              data: {
                quantity: {
                  decrement: material.quantityUsed
                }
              }
            });

            // Log the transaction
            await tx.inventoryTransaction.create({
              data: {
                itemId: material.itemId,
                type: 'OUT',
                quantity: material.quantityUsed,
                reason: `Completed Procedure: ${procedure.name} in Appointment #${id}`,
                referenceId: id
              }
            });

            // Optional: Check for low stock
            if (inventoryItem.quantity < inventoryItem.minThreshold) {
              fastify.log.warn(`Low stock for item: ${inventoryItem.name}. Current: ${inventoryItem.quantity}`);
            }
          }
        }

        return updatedAppointment;
      });

      return result;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(400).send({ error: error.message });
    }
  });

  /**
   * Update tooth status (Treatment History)
   */
  fastify.post('/patients/:patientId/tooth/:toothNumber', async (request, reply) => {
    const { patientId, toothNumber } = request.params;
    const { status, notes } = request.body;
    const { user } = request;

    try {
      const toothStatus = await prisma.toothStatus.create({
        data: {
          patientId,
          toothNumber: parseInt(toothNumber),
          status,
          notes,
          updatedBy: user.id // Full history tracking
        }
      });

      return toothStatus;
    } catch (error) {
      return reply.code(400).send({ error: error.message });
    }
  });

  /**
   * Get tooth history for a patient
   */
  fastify.get('/patients/:patientId/tooth/:toothNumber/history', async (request, reply) => {
    const { patientId, toothNumber } = request.params;

    const history = await prisma.toothStatus.findMany({
      where: {
        patientId,
        toothNumber: parseInt(toothNumber)
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        creator: {
          select: { fullName: true }
        }
      }
    });

    return history;
  });
}
