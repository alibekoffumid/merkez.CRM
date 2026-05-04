import { supabase } from '../../../supabaseClient';

export interface CallEvent {
  call_id: string;
  caller_id: string; // Phone number
  destination: string;
  status: 'ringing' | 'connected' | 'disconnected' | 'missed';
  recording_url?: string;
}

export const TelephonyService = {
  /**
   * Process an incoming call event from telephony provider webhooks
   */
  async handleIncomingCall(tenantId: string, event: CallEvent) {
    try {
      // 1. Identify or Create Contact
      let { data: contact } = await supabase
        .from('integration_contacts')
        .select('id, crm_contact_id')
        .eq('tenant_id', tenantId)
        .eq('external_id', event.caller_id)
        .eq('source', 'phone')
        .single();

      if (!contact) {
        const { data: newContact } = await supabase
          .from('integration_contacts')
          .insert({
            tenant_id: tenantId,
            external_id: event.caller_id,
            source: 'phone',
            name: 'New Caller'
          })
          .select()
          .single();
        contact = newContact;
      }

      // 2. Create Call Record in messages table
      await supabase.from('integration_messages').insert({
        tenant_id: tenantId,
        contact_id: contact?.id,
        direction: 'inbound',
        type: 'call',
        content: `Incoming call from ${event.caller_id}`,
        metadata: { 
          call_id: event.call_id, 
          status: event.status,
          recording: event.recording_url 
        }
      });

      // 3. Emit Realtime event for Client Popup (handled by Supabase Realtime automatically)
      return contact;
    } catch (error: any) {
      console.error('Telephony Error:', error);
    }
  },

  /**
   * Initiate Outbound Call (Click-to-Call)
   */
  async makeCall(tenantId: string, channelId: string, to: string) {
    // Example: Zadarma API Call /v1/request/callback/
    const { data: channel } = await supabase
      .from('integration_channels')
      .select('settings')
      .eq('id', channelId)
      .single();
    
    // API Request to provider...
  }
};
