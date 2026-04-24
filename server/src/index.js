// server/src/index.js
import Fastify from 'fastify';
import dentalRoutes from './routes/dental.js';

const fastify = Fastify({
  logger: true
});

// Register Plugins (Auth, CORS, etc. would go here)
// fastify.register(import('@fastify/cors'));
// fastify.register(import('./plugins/auth.js'));

// Register Dental Routes
fastify.register(dentalRoutes, { prefix: '/api/dental' });

const start = async () => {
  try {
    await fastify.listen({ port: 3001, host: '0.0.0.0' });
    console.log('Dental Backend running on port 3001');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
