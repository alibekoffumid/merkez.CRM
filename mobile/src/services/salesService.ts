import { supabase } from '../config/supabase';
import { POSCartItem } from '../types';
import { movementService } from './movementService';

export interface CreditSaleDetails {
  bank: string;
  months: number;
  contractTotal: number;
  monthlyPayment: number;
  markupPercent: number;
}

export type POSPaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'CREDIT';

export interface ProcessSaleOptions {
  discountAmount?: number;
  discountType?: 'percent' | 'fixed';
  discountValue?: number;
  clientName?: string;
  creditDetails?: CreditSaleDetails;
}

export const salesService = {
  async processSale(
    items: POSCartItem[],
    paymentMethod: POSPaymentMethod,
    discountOrOptions: number | ProcessSaleOptions = 0,
    clientNameArg?: string,
    creditDetailsArg?: CreditSaleDetails
  ): Promise<{ success: boolean; saleId: string; total: number; discountAmount: number }> {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    const saleId = `SALE-${Date.now().toString().slice(-6)}`;

    // Parse arguments supporting both object options and legacy positional params
    let discountAmount = 0;
    let discountType: 'percent' | 'fixed' = 'fixed';
    let discountValue = 0;
    let clientName = clientNameArg;
    let creditDetails = creditDetailsArg;

    if (typeof discountOrOptions === 'object' && discountOrOptions !== null) {
      discountAmount = discountOrOptions.discountAmount || 0;
      discountType = discountOrOptions.discountType || 'fixed';
      discountValue = discountOrOptions.discountValue ?? discountAmount;
      clientName = discountOrOptions.clientName ?? clientNameArg;
      creditDetails = discountOrOptions.creditDetails ?? creditDetailsArg;
    } else {
      discountAmount = Number(discountOrOptions) || 0;
      discountValue = discountAmount;
    }

    // 1. Calculate totals
    const subtotal = items.reduce((sum, item) => {
      const price = item.customPrice ?? item.product.sale_price ?? item.product.price ?? 0;
      return sum + price * item.quantity;
    }, 0);

    const total =
      paymentMethod === 'CREDIT' && creditDetails
        ? creditDetails.contractTotal
        : Math.max(0, subtotal - discountAmount);

    // 2. Decrement stock using movementService with reason 'sale'
    const dispatchItems = items.map((i) => ({
      productId: i.product.id,
      quantity: i.quantity,
      warehouseId: (i.product as any).warehouse_id,
    }));

    let channelPrefix = '[Kanal: Mağaza] ';
    let saleDetailsNote = '';

    if (paymentMethod === 'CREDIT' && creditDetails) {
      channelPrefix = `[Kanal: Kredit - ${creditDetails.bank}] `;
      saleDetailsNote = `Kredit Satışı (${creditDetails.months} ay): Müqavilə: ₼${creditDetails.contractTotal.toFixed(2)}, Aylıq: ₼${creditDetails.monthlyPayment.toFixed(2)}, Faiz: ${creditDetails.markupPercent.toFixed(1)}%`;
    } else {
      const methodLabel = paymentMethod === 'CASH' ? 'Nağd' : paymentMethod === 'CARD' ? 'Kart' : 'Köçürmə';
      saleDetailsNote = `POS Satış #${saleId} (Ödəniş: ${methodLabel})`;
    }

    let fullNote = `${channelPrefix}${saleDetailsNote}`;

    // Append discount info into notes so it's always visible in history
    if (discountAmount > 0) {
      if (discountType === 'percent' && discountValue) {
        fullNote += ` [Endirim: ${discountValue}% (-₼${discountAmount.toFixed(2)})]`;
      } else {
        fullNote += ` [Endirim: ₼${discountAmount.toFixed(2)}]`;
      }
    }

    if (clientName && clientName.trim()) {
      fullNote += ` [Müştəri: ${clientName.trim()}]`;
    }

    // Call recordDispatch with reason='sale' and discount fields
    await movementService.recordDispatch(
      dispatchItems,
      'sale',
      fullNote,
      undefined,
      discountAmount,
      discountType,
      total
    );

    // 3. Persist to retail_sales and retail_sale_items for web & reports sync
    try {
      if (userId) {
        const { data: saleRow, error: saleErr } = await supabase
          .from('retail_sales')
          .insert([{
            user_id: userId,
            total_amount: total,
            tax_amount: 0,
            payment_method: paymentMethod.toLowerCase(),
            discount_amount: discountAmount,
            discount_type: discountType,
            created_at: new Date().toISOString(),
          }])
          .select('id')
          .maybeSingle();

        if (!saleErr && saleRow?.id) {
          const saleItems = items.map((i) => {
            const effPrice = i.customPrice ?? i.product.sale_price ?? i.product.price ?? 0;
            const basePrice = i.product.sale_price ?? i.product.price ?? effPrice;
            return {
              sale_id: saleRow.id,
              product_id: i.product.id,
              product_name: i.product.name,
              quantity: i.quantity,
              price_at_sale: effPrice,
              base_price: basePrice,
              discount_amount: Math.max(0, basePrice - effPrice),
              discount_type: 'fixed',
              total: effPrice * i.quantity,
              created_at: new Date().toISOString(),
            };
          });
          await supabase.from('retail_sale_items').insert(saleItems);
        }
      }
    } catch (retailErr) {
      console.warn('retail_sales sync optional write error:', retailErr);
    }

    // 4. Record POS event if table exists for cashier sync
    try {
      for (const item of items) {
        await supabase.from('scanner_cart_events').insert([{
          user_id: userId,
          barcode: item.product.barcode || item.product.article_number || '',
          product_id: item.product.id,
          product_name: item.product.name,
          price: item.customPrice ?? item.product.sale_price ?? item.product.price ?? 0,
          quantity: item.quantity,
          status: 'processed',
        }]);
      }
    } catch (e) {
      console.warn('scanner_cart_events optional write error:', e);
    }

    return { success: true, saleId, total, discountAmount };
  },
};

