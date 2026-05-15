import { supabase } from '../../../supabaseClient';

export const TelegramService = {
  /**
   * Send a message through Telegram Bot API
   */
  async sendMessage(tenantId: string, channelId: string, chatId: string, text: string) {
    try {
      // 1. Fetch channel credentials from DB
      const { data: channel, error: channelError } = await supabase
        .from('integration_channels')
        .select('settings')
        .eq('id', channelId)
        .single();

      if (channelError || !channel) throw new Error('Telegram Channel not found');

      const { bot_token } = channel.settings;

      if (!bot_token) throw new Error('Bot token missing in settings');

      // 2. Call Telegram API
      const response = await fetch(`https://api.telegram.org/bot${bot_token}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'HTML'
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.description || 'Telegram API Error');
      }

      return result;
    } catch (error: any) {
      console.error('Telegram Send Error:', error);
      throw error;
    }
  }
};
