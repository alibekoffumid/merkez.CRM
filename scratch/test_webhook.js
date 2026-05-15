
const channelId = '4f179a45-69d1-40bb-a5a2-7892b440774c';
const webhookUrl = `https://rvywrxnmgwwudihgrxdp.supabase.co/functions/v1/omnichannel-webhook?channel_id=${channelId}`;

async function testWebhook() {
  const payload = {
    update_id: 999999,
    message: {
      message_id: 1,
      from: {
        id: 12345678,
        first_name: 'Test',
        username: 'testuser'
      },
      chat: {
        id: 12345678,
        type: 'private'
      },
      date: Math.floor(Date.now() / 1000),
      text: 'Manual Test Message'
    }
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.text();
    console.log('Status:', response.status);
    console.log('Response:', result);
  } catch (error) {
    console.error('Fetch Error:', error);
  }
}

testWebhook();
