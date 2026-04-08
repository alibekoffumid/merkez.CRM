import { supabase } from '../../../supabaseClient';
import { ETaxesSettings, FiscalTransaction, FiscalStats } from '../types';

export const etaxesService = {
  async getSettings(): Promise<ETaxesSettings | null> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const { data, error } = await supabase
      .from('e_taxes_settings')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching e-taxes settings:', error);
    }
    return data;
  },

  async saveSettings(settings: Partial<ETaxesSettings>): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No active session');

    const { error } = await supabase
      .from('e_taxes_settings')
      .upsert({
        ...settings,
        user_id: session.user.id,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;
  },

  async openShift(): Promise<void> {
    const settings = await this.getSettings();
    if (!settings) throw new Error('Settings not configured');

    // Here would be the real API call to the fiscal provider
    // const response = await fetch(`${settings.api_endpoint}/open-shift`, { ... });

    await this.saveSettings({
      shift_status: 'open',
      last_shift_open_at: new Date().toISOString(),
    });
  },

  async closeShift(): Promise<void> {
    const settings = await this.getSettings();
    if (!settings) throw new Error('Settings not configured');

    // Here would be the real API call for Z-Report
    // const response = await fetch(`${settings.api_endpoint}/z-report`, { ... });

    await this.saveSettings({
      shift_status: 'closed',
      last_shift_close_at: new Date().toISOString(),
    });
  },

  async fiscalizeOrder(orderId: string, paymentType: 'cash' | 'card'): Promise<string> {
    const settings = await this.getSettings();
    if (!settings) throw new Error('Settings not configured');
    if (settings.shift_status !== 'open') throw new Error('Shift is closed');

    // Fetch order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, order_items(*, product:products(*))')
      .eq('id', orderId)
      .single();

    if (orderError) throw orderError;

    // Simulate API Call to Fiscal Provider
    const mockFiscalId = `FISCAL-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    // Update order with fiscal info
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        fiscal_id: mockFiscalId,
        fiscal_status: 'success',
        payment_type: paymentType,
        fiscal_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (updateError) throw updateError;

    return mockFiscalId;
  },

  async getTransactions(): Promise<FiscalTransaction[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .not('fiscal_id', 'is', null)
      .order('fiscal_at', { ascending: false });

    if (error) throw error;
    return data.map(item => ({
      ...item,
      total_amount: Number(item.total_amount)
    }));
  },

  async getStats(): Promise<FiscalStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('orders')
      .select('total_amount, payment_type, fiscal_status')
      .not('fiscal_id', 'is', null)
      .gte('fiscal_at', today.toISOString());

    if (error) throw error;

    const settings = await this.getSettings();

    const stats = data.reduce((acc, curr) => {
      if (curr.fiscal_status === 'success') {
        if (curr.payment_type === 'cash') acc.todayCash += Number(curr.total_amount);
        if (curr.payment_type === 'card') acc.todayCard += Number(curr.total_amount);
      } else if (curr.fiscal_status === 'refunded') {
        acc.todayRefunds += Number(curr.total_amount);
      }
      return acc;
    }, { todayCash: 0, todayCard: 0, todayRefunds: 0 });

    return {
      ...stats,
      shiftStatus: settings?.shift_status || 'closed'
    };
  }
};
