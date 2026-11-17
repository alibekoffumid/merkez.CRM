/**
 * printJobService.js
 * Service for creating and queuing warehouse order / assembly sheet print jobs in Supabase.
 * The warehouse laptop in another network picks up 'pending' jobs and prints them on the thermal printer.
 */

import { supabase } from '../supabaseClient';

/**
 * Format clean, human-readable structured assembly sheet text (32-character width for 58mm/80mm thermal receipt printers)
 */
export function formatAssemblySheetText({
  orderNumber,
  warehouseName = '',
  staffName = '',
  date = new Date(),
  items = []
}) {
  const d = date instanceof Date ? date : new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  const dateStr = `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

  const line = '--------------------------------';
  const doubleLine = '================================';

  let text = '';
  text += `${doubleLine}\n`;
  text += `     SKLADA SIFARIŞ VƏRƏQİ\n`;
  text += `        (YIĞIM / ANBAR)\n`;
  text += `${doubleLine}\n`;
  text += `Tarix:     ${dateStr}\n`;
  if (orderNumber)   text += `Sifariş №: ${orderNumber}\n`;
  if (warehouseName) text += `Filial:    ${warehouseName}\n`;
  if (staffName)     text += `Göndərən:  ${staffName}\n`;
  text += `${line}\n`;
  text += `MƏHSUL                    SAY\n`;
  text += `${line}\n`;

  let totalQty = 0;
  items.forEach((item, index) => {
    const qty = item.quantity || 1;
    totalQty += qty;
    const num = `${index + 1}. `;
    text += `${num}${item.name}\n`;
    if (item.barcode) {
      text += `   Art/Barkod: ${item.barcode}\n`;
    }
    if (item.channel) {
      text += `   Kanal: ${item.channel}\n`;
    }
    if (item.saleRef) {
      text += `   Çek: ${item.saleRef}\n`;
    }
    text += `   Say: ${qty} ${item.unit || 'əd'}\n`;
    if (index < items.length - 1) {
      text += `   - - - - - - - - - - - - - -\n`;
    }
  });

  text += `${doubleLine}\n`;
  text += `CƏMİ ÇEŞİD: ${items.length}\n`;
  text += `CƏMİ SAY:   ${totalQty} əd\n`;
  text += `${doubleLine}\n`;
  text += `Status: PENDING (GÖZLƏYİR)\n`;
  text += `${doubleLine}\n\n\n`;

  return { text, totalQty };
}

/**
 * Creates a print job record in Supabase `print_jobs` table with status 'pending'
 */
export async function createWarehousePrintJob({
  warehouseId,
  warehouseName,
  staffName,
  items,
  userId
}) {
  if (!items || items.length === 0) {
    throw new Error('Heç bir məhsul seçilməyib');
  }

  const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
  const { text, totalQty } = formatAssemblySheetText({
    orderNumber,
    warehouseName,
    staffName,
    date: new Date(),
    items
  });

  const payload = {
    user_id: userId || null,
    warehouse_id: warehouseId || null,
    title: `Sklada sifariş (${items.length} məhsul)`,
    job_type: 'assembly_sheet',
    content: text,
    items: items,
    metadata: {
      order_number: orderNumber,
      warehouse_id: warehouseId,
      warehouse_name: warehouseName,
      sender_name: staffName,
      total_items: items.length,
      total_quantity: totalQty,
      sent_at: new Date().toISOString()
    },
    status: 'pending'
  };

  const { data, error } = await supabase
    .from('print_jobs')
    .insert([payload])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return { data, orderNumber, text, totalQty };
}
