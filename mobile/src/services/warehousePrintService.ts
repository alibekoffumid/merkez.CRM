import { supabase } from '../config/supabase';

export interface WarehouseOrderItem {
  product_id?: string;
  name: string;
  barcode?: string;
  article?: string;
  quantity: number;
  unit?: string;
  price?: number;
  total?: number;
  channel?: string;
  saleRef?: string;
  sellerName?: string;
  date?: string | Date;
}

export function formatAssemblySheetText({
  orderNumber,
  warehouseName = '',
  staffName = '',
  date = new Date(),
  items = []
}: {
  orderNumber?: string;
  warehouseName?: string;
  staffName?: string;
  date?: Date;
  items: WarehouseOrderItem[];
}) {
  const d = date instanceof Date ? date : new Date(date);
  const pad = (n: number) => String(n).padStart(2, '0');
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

  let totalQty = 0;
  let totalAmount = 0;

  items.forEach((item, index) => {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.price) || 0;
    const itemTotal = Number(item.total) || (qty * price);
    totalQty += qty;
    totalAmount += itemTotal;

    const num = `${index + 1}. `;
    text += `${num}${item.name}\n`;
    text += `   Say: ${qty} ${item.unit || 'əd'}\n`;
    text += `   Satış qiyməti: ${price.toFixed(2)} ₼\n`;
    if (index < items.length - 1) {
      text += `   - - - - - - - - - - - - - -\n`;
    }
  });

  text += `${doubleLine}\n`;
  text += `CƏMİ ÇEŞİD:     ${items.length}\n`;
  text += `CƏMİ SAY:       ${totalQty} əd\n`;
  text += `YEKUN MƏBLƏĞ:   ${totalAmount.toFixed(2)} ₼\n`;
  text += `${doubleLine}\n`;
  text += `Status: PENDING (GÖZLƏYİR)\n`;
  text += `${doubleLine}\n\n\n`;

  return { text, totalQty, totalAmount };
}

export async function createWarehousePrintJob({
  warehouseId,
  warehouseName,
  staffName,
  items,
  userId
}: {
  warehouseId?: string;
  warehouseName?: string;
  staffName?: string;
  items: WarehouseOrderItem[];
  userId?: string;
}) {
  if (!items || items.length === 0) return null;

  const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
  const { text, totalQty, totalAmount } = formatAssemblySheetText({
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
      total_amount: totalAmount,
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
    console.warn('Error inserting print job from mobile:', error);
    return null;
  }
  return { data, orderNumber, text, totalQty };
}
