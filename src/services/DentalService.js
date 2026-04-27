import { supabase } from '../supabaseClient';

export const DentalService = {
  // --- Patients ---
  async getPatients(search = '') {
    let query = supabase
      .from('customers')
      .select('*')
      .order('name');

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getPatientProfile(customerId) {
    const { data, error } = await supabase
      .from('dental_patient_profiles')
      .select('*')
      .eq('customer_id', customerId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is 'no rows found'
    return data;
  },

  // --- Appointments ---
  async getAppointments(date) {
    const { data, error } = await supabase
      .from('dental_records')
      .select('*')
      .eq('appointment_date', date);

    if (error) throw error;
    return data;
  },

  async createAppointment(appointment) {
    const { data, error } = await supabase
      .from('dental_records')
      .insert([appointment])
      .select();

    if (error) throw error;
    return data[0];
  },

  // --- Tooth History ---
  async getToothHistory(patientId) {
    const { data, error } = await supabase
      .from('dental_tooth_history')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async updateToothCondition(patientId, toothNumber, condition, notes = '', userId) {
    const { data, error } = await supabase
      .from('dental_tooth_history')
      .insert([{
        patient_id: patientId,
        tooth_number: toothNumber,
        condition,
        notes,
        updated_by: userId
      }])
      .select();

    if (error) throw error;
    return data[0];
  },

  // --- X-Rays ---
  async getXRays(patientId) {
    const { data, error } = await supabase
      .from('dental_xrays')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // --- Inventory ---
  async getInventory(search = '') {
    let query = supabase
      .from('dental_inventory')
      .select('*')
      .order('name');

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async updateInventoryItem(id, updates) {
    const { data, error } = await supabase
      .from('dental_inventory')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw error;
    return data[0];
  }
};
