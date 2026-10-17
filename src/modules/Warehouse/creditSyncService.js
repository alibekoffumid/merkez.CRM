import { supabase } from '../../supabaseClient';

/**
 * Parses credit and customer details from stock dispatch notes.
 * Supported formats:
 * - "[Kanal: Kredit - Birkart] Kredit Satışı (12 ay): Müqavilə: ₼139.84, Aylıq: ₼11.67, Faiz: 21.6% [Müştəri: Ümid Babayev (+994777688848)]"
 * - "[Kanal: Kredit - Tamkart] Kredit Satışı (6 ay): Kassaya: ₼500.00, Mənfəət: ₼50.00 [Müştəri: Əli Həsənov]"
 */
export function parseCreditDispatchNote(note) {
  if (!note || typeof note !== 'string') return null;

  // Check if note indicates credit sale
  const isCredit = /kredit|birkart|tamkart|ferrum|hiss[əe]-hiss[əe]/i.test(note);
  if (!isCredit) return null;

  // 1. Customer name and phone
  let clientMatch = note.match(/\[(?:M[üu]?[şs]?t[əe]ri|Musteri|Client|Клиент):\s*([^\]]+)\]/i);
  if (!clientMatch) {
    clientMatch = note.match(/(?:M[üu]?[şs]?t[əe]ri|Musteri|Client|Клиент):\s*([^\n\r,\]]+)/i);
  }
  if (!clientMatch) return null;

  const rawClient = clientMatch[1].trim();
  let clientName = rawClient;
  let clientPhone = '';

  // Extract phone in parentheses or after dash
  const phoneParenMatch = rawClient.match(/^(.*?)\s*[\(\[]([+0-9\s-]+)[\)\]]$/);
  const phoneDashMatch = rawClient.match(/^(.*?)\s*[-—]\s*([+0-9\s-]{7,})$/);
  if (phoneParenMatch) {
    clientName = phoneParenMatch[1].trim();
    clientPhone = phoneParenMatch[2].trim();
  } else if (phoneDashMatch) {
    clientName = phoneDashMatch[1].trim();
    clientPhone = phoneDashMatch[2].trim();
  }

  // 2. Bank
  const bankMatch = note.match(/\[Kanal:\s*(?:Kredit\s*[-—]\s*)?([^\]]+)\]/i) || note.match(/Bank:\s*([A-Za-z0-9\s]+)/i);
  let bank = bankMatch ? bankMatch[1].trim() : '';
  if (!bank) {
    if (/birkart/i.test(note)) bank = 'Birkart';
    else if (/tamkart/i.test(note)) bank = 'Tamkart';
    else if (/ferrum/i.test(note)) bank = 'Ferrum';
    else if (/abb/i.test(note)) bank = 'ABB Kredit';
    else bank = 'Kredit';
  }

  // 3. Months
  const monthsMatch = note.match(/(\d+)\s*ay/i) || note.match(/(\d+)\s*(?:month|m|ayl[ıi]q)/i);
  const months = monthsMatch ? parseInt(monthsMatch[1], 10) : 12;

  // 4. Contract Total
  let contractTotal = null;
  const contractMatch = note.match(/(?:Müqavil[əe]|Muqavile|C[əe]mi|Toplam):\s*₼?\s*([0-9.,]+)/i);
  if (contractMatch) {
    contractTotal = parseFloat(contractMatch[1].replace(',', ''));
  }
  if (!contractTotal) {
    const grossMatch = note.match(/Kassaya:\s*₼?\s*([0-9.,]+)/i);
    if (grossMatch) contractTotal = parseFloat(grossMatch[1].replace(',', ''));
  }
  if (!contractTotal) {
    const meblegMatch = note.match(/\[M[əe]bl[əe][gğ]:\s*₼?\s*([0-9.,]+)\]/i);
    if (meblegMatch) contractTotal = parseFloat(meblegMatch[1].replace(',', ''));
  }
  if (!contractTotal) {
    const qiymetMatch = note.match(/\[Qiym[əe]t:\s*₼?\s*([0-9.,]+)\]/i);
    if (qiymetMatch) contractTotal = parseFloat(qiymetMatch[1].replace(',', ''));
  }

  if (!contractTotal || isNaN(contractTotal)) return null;

  // 5. Monthly payment
  let monthlyPayment = null;
  const monthlyMatch = note.match(/Ayl[ıi]q:\s*₼?\s*([0-9.,]+)/i);
  if (monthlyMatch) {
    monthlyPayment = parseFloat(monthlyMatch[1].replace(',', ''));
  } else if (months > 0) {
    monthlyPayment = Number((contractTotal / months).toFixed(2));
  }

  // 6. Markup percent
  const markupMatch = note.match(/Faiz:\s*([0-9.,]+)%/i);
  const markupPercent = markupMatch ? parseFloat(markupMatch[1]) : 0;

  return {
    clientName,
    clientPhone,
    bank,
    months,
    contractTotal,
    monthlyPayment,
    markupPercent
  };
}

/**
 * Scans stock dispatches with credit notes and ensures customers, contracts,
 * installments, and debts exist in the CRM database.
 */
export async function syncCreditSales(userId) {
  try {
    const { data: authData } = await supabase.auth.getUser();
    const currentAuthId = authData?.user?.id || userId;
    if (!currentAuthId) {
      console.warn('syncCreditSales: User not authenticated');
      return { success: false, syncedCount: 0, error: 'User not authenticated' };
    }

    // Try multiple queries to fetch dispatches safely
    let dispatches = null;
    let dispError = null;

    // Query with issued_at without filtering reason='sale' so mobile dispatches are captured
    const res1 = await supabase
      .from('stock_dispatches')
      .select('*')
      .order('issued_at', { ascending: false })
      .limit(300);

    if (!res1.error && res1.data) {
      dispatches = res1.data;
    } else {
      console.warn('Query 1 failed, fallback to raw select:', res1.error);
      const res2 = await supabase
        .from('stock_dispatches')
        .select('*')
        .limit(300);

      if (!res2.error && res2.data) {
        dispatches = res2.data;
      } else {
        dispError = res2.error || res1.error;
      }
    }

    if (dispError && (!dispatches || dispatches.length === 0)) {
      console.error('syncCreditSales error fetching dispatches:', dispError);
      return { success: false, syncedCount: 0, error: dispError.message };
    }

    // Filter in JS for maximum reliability
    const creditDispatches = (dispatches || []).filter(d => {
      const note = d.notes || '';
      return /kredit|birkart|tamkart|ferrum|müştəri|musteri/i.test(note);
    });

    let syncedCount = 0;
    const errors = [];

    for (const dispatch of creditDispatches) {
      const parsed = parseCreditDispatchNote(dispatch.notes);
      if (!parsed) continue;

      // Always associate created customer and credit with current active user to satisfy RLS
      const targetUserId = currentAuthId;

      // 1. Check if customer exists
      let customer = null;
      let custQuery = supabase
        .from('customers')
        .select('id, name, phone, debt_balance')
        .eq('user_id', targetUserId);

      if (parsed.clientPhone) {
        custQuery = custQuery.eq('phone', parsed.clientPhone);
      } else {
        custQuery = custQuery.ilike('name', parsed.clientName);
      }

      const { data: existingCusts } = await custQuery;
      if (existingCusts && existingCusts.length > 0) {
        customer = existingCusts[0];
      }

      if (!customer) {
        const { data: newCust, error: createCustErr } = await supabase
          .from('customers')
          .insert([{
            name: parsed.clientName,
            phone: parsed.clientPhone || null,
            status: 'Active',
            type: 'Client',
            debt_balance: parsed.contractTotal,
            user_id: targetUserId
          }])
          .select()
          .maybeSingle();

        if (createCustErr) {
          console.error('Error creating customer in sync:', createCustErr);
          errors.push(createCustErr.message);
          continue;
        }
        customer = newCust;
      }

      if (!customer?.id) {
        console.warn('Customer could not be resolved or created');
        continue;
      }

      // 2. Check if credit agreement already exists for this customer
      const { data: existingCredits } = await supabase
        .from('customer_credits')
        .select('id, total_amount, months')
        .eq('customer_id', customer.id);

      const alreadyExists = existingCredits?.some(c => 
        Number(c.months) === parsed.months && 
        Math.abs(Number(c.total_amount) - Number(parsed.contractTotal)) < 0.5
      );

      if (alreadyExists) {
        continue;
      }

      // 3. Insert customer_debts record
      const dateRecorded = dispatch.issued_at || new Date().toISOString();
      await supabase.from('customer_debts').insert([{
        user_id: targetUserId,
        customer_id: customer.id,
        type: 'debt',
        amount: parsed.contractTotal,
        description: `Kredit (${parsed.bank} - ${parsed.months} ay): Müqavilə: ₼${parsed.contractTotal.toFixed(2)}, Aylıq: ₼${parsed.monthlyPayment.toFixed(2)}`,
        created_at: dateRecorded
      }]);

      // 4. Insert customer_credits record
      const contractNote = `Bank: ${parsed.bank}, Müqavilə: ₼${parsed.contractTotal.toFixed(2)}, Aylıq: ₼${parsed.monthlyPayment.toFixed(2)}, Faiz: ${parsed.markupPercent}%`;
      const { data: creditData, error: creditErr } = await supabase
        .from('customer_credits')
        .insert([{
          user_id: targetUserId,
          customer_id: customer.id,
          total_amount: parsed.contractTotal,
          months: parsed.months,
          monthly_payment: parsed.monthlyPayment,
          remaining_months: parsed.months,
          notes: contractNote,
          status: 'active',
          created_at: dateRecorded
        }])
        .select()
        .maybeSingle();

      if (creditErr || !creditData) {
        console.error('Error creating customer_credits in sync:', creditErr);
        errors.push(creditErr?.message || 'Credit creation error');
        continue;
      }

      // 5. Insert customer_credit_installments
      const installments = [];
      const baseDate = new Date(dateRecorded);
      for (let i = 1; i <= parsed.months; i++) {
        const dueDate = new Date(baseDate);
        dueDate.setDate(dueDate.getDate() + (30 * i));
        installments.push({
          credit_id: creditData.id,
          month_number: i,
          amount: parsed.monthlyPayment,
          due_date: dueDate.toISOString().split('T')[0],
          status: 'unpaid'
        });
      }
      await supabase.from('customer_credit_installments').insert(installments);

      // 6. Update customer debt balance if needed
      if (Number(customer.debt_balance || 0) < parsed.contractTotal) {
        await supabase
          .from('customers')
          .update({ debt_balance: Math.max(Number(customer.debt_balance || 0), parsed.contractTotal) })
          .eq('id', customer.id);
      }

      syncedCount++;
    }

    return { 
      success: true, 
      syncedCount, 
      scannedCount: creditDispatches.length,
      errors: errors.length > 0 ? errors : undefined 
    };
  } catch (err) {
    console.error('syncCreditSales exception:', err);
    return { success: false, syncedCount: 0, error: err.message };
  }
}
