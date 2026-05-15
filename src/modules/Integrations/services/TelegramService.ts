
export const TelegramService = {
  /**
   * Send a message via Telegram Bot API
   */
  async sendMessage(botToken: string, chatId: string | number, text: string) {
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.description || 'Failed to send Telegram message');
      
      return result;
    } catch (error: any) {
      console.error('Telegram Send Error:', error);
      throw error;
    }
  },

  /**
   * Set up webhook for Telegram Bot
   */
  async setupWebhook(botToken: string, channelId: string) {
    try {
      // Use the actual Supabase URL for the Edge Function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const webhookUrl = `${supabaseUrl}/functions/v1/omnichannel-webhook?channel_id=${channelId}`;
      
      console.log('Setting up Telegram Webhook:', webhookUrl);

      const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: webhookUrl
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.description || 'Failed to set Telegram webhook');
      
      return result;
    } catch (error: any) {
      console.error('Telegram Webhook Setup Error:', error);
      throw error;
    }
  }
};
