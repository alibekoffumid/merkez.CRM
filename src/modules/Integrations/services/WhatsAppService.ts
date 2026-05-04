import { supabase } from '../../../supabaseClient';

export interface WhatsAppMessage {
  to: string;
  type: 'text' | 'image' | 'template';
  text?: { body: string };
  image?: { link: string };
  template?: {
    name: string;
    language: { code: string };
  };
}

export const WhatsAppService = {
  /**
   * Send a message through WhatsApp Business API (Generic Adapter)
   * This logic can be used for Twilio, 360dialog, or direct Meta Graph API
   */
  async sendMessage(tenantId: string, channelId: string, message: WhatsAppMessage) {
    try {
      // 1. Fetch channel credentials from DB
      const { data: channel, error: channelError } = await supabase
        .from('integration_channels')
        .select('settings')
        .eq('id', channelId)
        .eq('tenant_id', tenantId)
        .single();

      if (channelError || !channel) throw new Error('Channel not found or inactive');

      const { api_key, phone_number_id, provider_url } = channel.settings;

      // 2. Call Provider API (Mocking Meta Graph API call)
      const response = await fetch(`${provider_url || 'https://graph.facebook.com/v17.0'}/${phone_number_id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${api_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: message.to,
          type: message.type,
          ...(message.type === 'text' && { text: message.text }),
          ...(message.type === 'template' && { template: message.template }),
        }),
      });

      const result = await response.json();

      // 3. Log to integration_messages table
      if (response.ok) {
        await supabase.from('integration_messages').insert({
          tenant_id: tenantId,
          channel_id: channelId,
          direction: 'outbound',
          type: message.type,
          content: message.text?.body || `Template: ${message.template?.name}`,
          metadata: { provider_message_id: result.messages?.[0]?.id },
          status: 'sent'
        });
      }

      return result;
    } catch (error: any) {
      console.error('WhatsApp Send Error:', error);
      throw error;
    }
  },

  /**
   * Mark message as read (Updating local status)
   */
  async markAsRead(messageId: string) {
    return await supabase
      .from('integration_messages')
      .update({ status: 'read' })
      .eq('id', messageId);
  }
};
