
const botToken = '8836779840:AAFCOyW47duv5z6e9B7HSX_ju51YQqCSU2E';

async function checkWebhook() {
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
    const result = await response.json();
    console.log('Webhook Info:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error checking webhook:', error);
  }
}

checkWebhook();
