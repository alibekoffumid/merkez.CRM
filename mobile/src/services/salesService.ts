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

export type POSPaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'CREDIT' | 'DEPOSIT';

export interface ProcessSaleOptions {
  discountAmount?: number;
  discountType?: 'percent' | 'fixed';
  discountValue?: number;
  clientName?: string;
  clientPhone?: string;
  creditDetails?: CreditSaleDetails;
  depositDetails?: {
    advanceAmount: number;
    advanceRecipient?: string;
  };
}

export const salesService = {
  async processSale(
    items: POSCartItem[],
    paymentMethod: POSPaymentMethod,
    discountOrOptions: number | ProcessSaleOptions = 0,
    clientNameArg?: string,
    creditDetailsArg?: CreditSaleDetails
  ): Promise<{
    success: boolean;
    saleId: string;
    transactionId?: string;
    receiptNumber?: string;
    total: number;
    discountAmount: number;
  }> {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    const saleId = `SALE-${Date.now().toString().slice(-6)}`;
    let createdSaleId: string | undefined;

    // Parse arguments supporting both object options and legacy positional params
    let discountAmount = 0;
    let discountType: 'percent' | 'fixed' = 'fixed';
    let discountValue = 0;
    let clientName = clientNameArg;
    let creditDetails = creditDetailsArg;
    let depositDetails: { advanceAmount: number; advanceRecipient?: string } | undefined;

    if (typeof discountOrOptions === 'object' && discountOrOptions !== null) {
      discountAmount = discountOrOptions.discountAmount || 0;
      discountType = discountOrOptions.discountType || 'fixed';
      discountValue = discountOrOptions.discountValue ?? discountAmount;
      clientName = discountOrOptions.clientName ?? clientNameArg;
      creditDetails = discountOrOptions.creditDetails ?? creditDetailsArg;
      depositDetails = discountOrOptions.depositDetails;
    } else {
      discountAmount = Number(discountOrOptions) || 0;
      discountValue = discountAmount;
    }

    // 1. Calculate totals
    const subtotal = items.reduce((sum, item) => {
      const price = item.isGift ? 0 : (item.customPrice ?? item.product.sale_price ?? item.product.price ?? 0);
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
    } else if (paymentMethod === 'DEPOSIT') {
      saleDetailsNote = `Məhsul Satışı (Ödəniş: Beh)`;
      if (depositDetails?.advanceAmount) {
        saleDetailsNote += ` [Avans: ₼${Number(depositDetails.advanceAmount).toFixed(2)}]`;
      }
      if (depositDetails?.advanceRecipient) {
        saleDetailsNote += ` [Avans Alan: ${depositDetails.advanceRecipient}]`;
      }
    } else {
      const methodLabel = paymentMethod === 'CASH' ? 'Nağd' : paymentMethod === 'CARD' ? 'Kartdan karta(Hesab)' : 'Köçürmə';
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

    let clientPhone = typeof discountOrOptions === 'object' && discountOrOptions !== null ? discountOrOptions.clientPhone : undefined;
    let parsedClientName = clientName?.trim() || '';
    let parsedClientPhone = clientPhone?.trim() || '';

    // Handle "Name (Phone)" format if phone was passed inside name string
    if (parsedClientName.includes('(') && parsedClientName.includes(')')) {
      const match = parsedClientName.match(/^(.*?)\s*\((.*?)\)$/);
      if (match) {
        parsedClientName = match[1].trim();
        if (!parsedClientPhone) parsedClientPhone = match[2].trim();
      }
    }

    const formattedClientLabel = parsedClientPhone
      ? `${parsedClientName} (${parsedClientPhone})`
      : parsedClientName;

    if (formattedClientLabel) {
      fullNote += ` [Müştəri: ${formattedClientLabel}]`;
    }

    const giftItems = items.filter((i) => i.isGift);
    if (giftItems.length > 0) {
      const giftNames = giftItems
        .map((g) => `${g.product.name} (x${g.quantity}, Dəyəri: ₼${(g.originalPrice ?? g.product.sale_price ?? g.product.price ?? 0).toFixed(2)})`)
        .join(', ');
      fullNote += ` [🎁 HƏDİYYƏ: ${giftNames}]`;
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

    // 2.1. Persist or link Customer in CRM customers table
    let customerId: string | undefined;
    if (userId && parsedClientName) {
      try {
        let query = supabase
          .from('customers')
          .select('id, name, phone, debt_balance')
          .eq('user_id', userId);

        if (parsedClientPhone) {
          query = query.eq('phone', parsedClientPhone);
        } else {
          query = query.ilike('name', parsedClientName);
        }

        const { data: existingCust } = await query.maybeSingle();

        if (existingCust) {
          customerId = existingCust.id;
          if (paymentMethod === 'CREDIT' && creditDetails) {
            const newDebt = Number(existingCust.debt_balance || 0) + creditDetails.contractTotal;
            await supabase
              .from('customers')
              .update({ debt_balance: newDebt })
              .eq('id', customerId);
          }
        } else {
          const { data: newCust, error: newCustErr } = await supabase
            .from('customers')
            .insert([{
              name: parsedClientName,
              phone: parsedClientPhone || null,
              status: 'Active',
              type: 'Client',
              debt_balance: (paymentMethod === 'CREDIT' && creditDetails) ? creditDetails.contractTotal : 0,
              user_id: userId
            }])
            .select('id')
            .single();

          if (!newCustErr && newCust) {
            customerId = newCust.id;
          }
        }
      } catch (custErr) {
        console.warn('Customer handling in salesService error:', custErr);
      }
    }

    // 2.2. If Credit sale, create contract & installments in customer_credits
    if (paymentMethod === 'CREDIT' && creditDetails && customerId && userId) {
      try {
        const productNames = items.map((i) => i.product.name).join(', ');
        const creditNote = `Məhsul(lar): ${productNames} | Bank: ${creditDetails.bank}, Müqavilə: ₼${creditDetails.contractTotal.toFixed(2)}, Aylıq: ₼${creditDetails.monthlyPayment.toFixed(2)}, Faiz: ${creditDetails.markupPercent.toFixed(1)}%`;

        // 1. Log to customer_debts
        await supabase.from('customer_debts').insert([{
          user_id: userId,
          customer_id: customerId,
          type: 'debt',
          amount: creditDetails.contractTotal,
          description: `Kredit (${creditDetails.bank} - ${creditDetails.months} ay) [${productNames}]: Müqavilə: ₼${creditDetails.contractTotal.toFixed(2)}, Aylıq: ₼${creditDetails.monthlyPayment.toFixed(2)}, Faiz: ${creditDetails.markupPercent.toFixed(1)}%`
        }]);

        // 2. Insert into customer_credits
        const { data: creditData, error: creditErr } = await supabase
          .from('customer_credits')
          .insert([{
            user_id: userId,
            customer_id: customerId,
            total_amount: creditDetails.contractTotal,
            months: creditDetails.months,
            monthly_payment: creditDetails.monthlyPayment,
            remaining_months: creditDetails.months,
            notes: creditNote,
            status: 'active'
          }])
          .select('id')
          .single();

        // 3. Generate monthly installments
        if (!creditErr && creditData?.id) {
          const installmentsToInsert = [];
          for (let i = 1; i <= creditDetails.months; i++) {
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + (30 * i));
            installmentsToInsert.push({
              credit_id: creditData.id,
              month_number: i,
              amount: creditDetails.monthlyPayment,
              due_date: dueDate.toISOString().split('T')[0],
              status: 'unpaid'
            });
          }
          await supabase.from('customer_credit_installments').insert(installmentsToInsert);
        }
      } catch (credErr) {
        console.warn('Customer credit create error in salesService:', credErr);
      }
    }

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
          createdSaleId = saleRow.id;
          const saleItems = items.map((i) => {
            const basePrice = i.originalPrice ?? i.product.sale_price ?? i.product.price ?? 0;
            const effPrice = i.isGift ? 0 : (i.customPrice ?? basePrice);
            return {
              sale_id: saleRow.id,
              product_id: i.product.id,
              product_name: i.isGift ? `[🎁 Hədiyyə] ${i.product.name}` : i.product.name,
              quantity: i.quantity,
              price_at_sale: effPrice,
              base_price: basePrice,
              discount_amount: i.isGift ? basePrice * i.quantity : Math.max(0, basePrice - effPrice),
              discount_type: i.isGift ? 'gift' : 'fixed',
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

    const transactionId =
      createdSaleId ||
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    const receiptNumber = 'D' + transactionId.replace(/-/g, '').slice(0, 7).toUpperCase();

    return {
      success: true,
      saleId,
      transactionId,
      receiptNumber,
      total,
      discountAmount,
    };
  },
};

