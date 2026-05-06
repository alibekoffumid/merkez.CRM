import { RentLog } from '../types/fleet';
import { toast } from 'react-hot-toast';

export const sendDriverDailyReport = async (log: RentLog) => {
  const { driver, vehicle, actual_revenue, daily_plan, commission } = log;
  
  if (!driver?.whatsapp_number) {
    toast.error('Номер WhatsApp не указан для этого водителя');
    return;
  }

  const netProfit = actual_revenue - daily_plan - commission;

  // Azerbaijani report text
  const message = `
📊 *Mərkəz Fleet - Gündəlik Hesabat*
🗓 Tarix: ${new Date().toLocaleDateString('az-AZ')}

🚗 *Avtomobil:* ${vehicle?.plate_number} (${vehicle?.brand_model})
👤 *Sürücü:* ${driver.full_name}

---
💰 *Maliyyə detalları:*
- Gündəlik plan: ${daily_plan} ₼
- Ümumi gəlir: ${actual_revenue} ₼
- Komissiya: ${commission} ₼
---
✅ *Xalis mənfəət:* ${netProfit.toFixed(2)} ₼

Hörmətlə, ${driver.business_id} taksoparkı.
`.trim();

  try {
    // Calling the Omnichannel API (Assuming there's a Supabase function or endpoint for this)
    const response = await fetch('/api/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: driver.whatsapp_number,
        message: message
      })
    });

    if (response.ok) {
      toast.success('Hesabat uğurla göndərildi! ✅');
    } else {
      // Fallback for demo: Open WhatsApp web/app link
      const encodedMsg = encodeURIComponent(message);
      window.open(`https://wa.me/${driver.whatsapp_number}?text=${encodedMsg}`, '_blank');
      toast.success('WhatsApp açıldı...');
    }
  } catch (error) {
    console.error('WhatsApp send error:', error);
    // Fallback
    const encodedMsg = encodeURIComponent(message);
    window.open(`https://wa.me/${driver.whatsapp_number}?text=${encodedMsg}`, '_blank');
  }
};
