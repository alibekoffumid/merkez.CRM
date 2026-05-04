import { supabase } from '../../../supabaseClient';

export const InstagramService = {
  /**
   * Send a reply to Instagram Direct
   * Uses Instagram Graph API for Messenger
   */
  async sendReply(tenantId: string, channelId: string, recipientId: string, text: string) {
    try {
      const { data: channel } = await supabase
        .from('integration_channels')
        .select('settings')
        .eq('id', channelId)
        .single();

      const { page_access_token } = channel?.settings || {};

      const response = await fetch(`https://graph.facebook.com/v17.0/me/messages?access_token=${page_access_token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text: text },
          messaging_type: "RESPONSE"
        }),
      });

      const result = await response.json();

      if (response.ok) {
        await supabase.from('integration_messages').insert({
          tenant_id: tenantId,
          channel_id: channelId,
          direction: 'outbound',
          type: 'text',
          content: text,
          metadata: { ig_mid: result.message_id },
          status: 'sent'
        });
      }

      return result;
    } catch (error: any) {
      console.error('Instagram Send Error:', error);
      throw error;
    }
  },

  /**
   * Fetch latest direct messages (usually handled via Webhooks, but this is for polling/refresh)
   */
  async syncMessages(channelId: string) {
     // Implementation would fetch via Graph API GET /{ig-user-id}/conversations
  }
};
