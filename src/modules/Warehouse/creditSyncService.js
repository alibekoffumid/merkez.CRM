import { supabase } from '../../supabaseClient';

/**
 * Parses credit and customer details from stock dispatch notes.
 * Supported formats:
 * - "[Kanal: Kredit - Birkart] Kredit Satışı (12 ay): Müqavilə: ₼139.84, Aylıq: ₼11.67, Faiz: 21.6% [Müştəri: Ümid Babayev (+994777688848)]"
 * - "[Kanal: Kredit - Tamkart] Kredit Satışı (6 ay): Kassaya: ₼500.00, Mənfəət: ₼50.00 [Müştəri: Əli Həsənov]"
 */
export function parseCreditDispatchNote(note) {
  if (!note || typeof note !== 'string') return null;
  if (!note.toLowerCase().includes('kredit')) return null;

  // 1. Customer
  const clientMatch = note.match(/\[Müştəri:\s*([^\]]+)\]/i);
  if (!clientMatch) return null;

  const rawClient = clientMatch[1].trim();
  let clientName = rawClient;
  let clientPhone = '';

  const phoneMatch = rawClient.match(/^(.*?)\s*\((.*?)\)$/);
  if (phoneMatch) {
    clientName = phoneMatch[1].trim();
    clientPhone = phoneMatch[2].trim();
  }

  // 2. Bank
  const bankMatch = note.match(/\[Kanal:\s*Kredit\s*-\s*([^\]]+)\]/i);
  const bank = bankMatch ? bankMatch[1].trim() : 'Kredit';

  // 3. Months
  const monthsMatch = note.match(/Kredit Satışı\s*\(([0-9]+)\s*ay\)/i);
  const months = monthsMatch ? parseInt(monthsMatch[1], 10) : 12;

  // 4. Contract Total
  let contractTotal = null;
  const contractMatch = note.match(/Müqavilə:\s*₼?([0-9.,]+)/i);
  if (contractMatch) {
    contractTotal = parseFloat(contractMatch[1].replace(',', ''));
  } else {
    const grossMatch = note.match(/Kassaya:\s*₼?([0-9.,]+)/i);
    if (grossMatch) {
      contractTotal = parseFloat(grossMatch[1].replace(',', ''));
    } else {
      const meblegMatch = note.match(/\[Məbləğ:\s*₼?([0-9.,]+)\]/i);
      if (meblegMatch) {
        contractTotal = parseFloat(meblegMatch[1].replace(',', ''));
      }
    }
  }

  if (!contractTotal || isNaN(contractTotal)) return null;

  // 5. Monthly payment
  let monthlyPayment = null;
  const monthlyMatch = note.match(/Aylıq:\s*₼?([0-9.,]+)/i);
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
  if (!userId) return { success: false, syncedCount: 0 };

  try {
    // 1. Fetch recent credit sales from stock_dispatches
    const { data: dispatches, error: dispError } = await supabase
      .from('stock_dispatches')
      .select('id, notes, issued_at, created_at, user_id')
      .eq('reason', 'sale')
      .ilike('notes', '%Kredit%')
      .order('created_at', { ascending: false })
      .limit(100);

    if (dispError || !dispatches) {
      console.warn('syncCreditSales error fetching dispatches:', dispError);
      return { success: false, syncedCount: 0, error: dispError };
    }

    let syncedCount = 0;

    for (const dispatch of dispatches) {
      const parsed = parseCreditDispatchNote(dispatch.notes);
      if (!parsed) continue;

      const effectiveUserId = dispatch.user_id || userId;

      // Check if customer exists
      let custQuery = supabase
        .from('customers')
        .select('id, name, phone, debt_balance')
        .eq('user_id', effectiveUserId);

      if (parsed.clientPhone) {
        custQuery = custQuery.eq('phone', parsed.clientPhone);
      } else {
        custQuery = custQuery.ilike('name', parsed.clientName);
      }

      const { data: existingCusts } = await custQuery;
      let customer = existingCusts && existingCusts.length > 0 ? existingCusts[0] : null;

      if (!customer) {
        // Create customer
        const { data: newCust, error: createCustErr } = await supabase
          .from('customers')
          .insert([{
            name: parsed.clientName,
            phone: parsed.clientPhone || null,
            status: 'Active',
            type: 'Client',
            debt_balance: parsed.contractTotal,
            user_id: effectiveUserId
          }])
          .select()
          .single();

        if (createCustErr || !newCust) {
          console.warn('Failed to auto-create customer:', createCustErr);
          continue;
        }
        customer = newCust;
      }

      // Check if credit agreement already exists for this customer
      const { data: existingCredits } = await supabase
        .from('customer_credits')
        .select('id, total_amount, months')
        .eq('customer_id', customer.id);

      const alreadyExists = existingCredits?.some(c => 
        Number(c.months) === parsed.months && 
        Math.abs(Number(c.total_amount) - Number(parsed.contractTotal)) < 0.1
      );

      if (alreadyExists) {
        continue;
      }

      // Credit does not exist, create it!
      const contractNote = `Bank: ${parsed.bank}, Müqavilə: ₼${parsed.contractTotal.toFixed(2)}, Aylıq: ₼${parsed.monthlyPayment.toFixed(2)}, Faiz: ${parsed.markupPercent}%`;
      const dateRecorded = dispatch.issued_at || dispatch.created_at || new Date().toISOString();

      // 1. Insert customer_debts record
      await supabase.from('customer_debts').insert([{
        user_id: effectiveUserId,
        customer_id: customer.id,
        type: 'debt',
        amount: parsed.contractTotal,
        description: `Kredit (${parsed.bank} - ${parsed.months} ay): Müqavilə: ₼${parsed.contractTotal.toFixed(2)}, Aylıq: ₼${parsed.monthlyPayment.toFixed(2)}`,
        created_at: dateRecorded
      }]);

      // 2. Insert customer_credits record
      const { data: creditData, error: creditErr } = await supabase
        .from('customer_credits')
        .insert([{
          user_id: effectiveUserId,
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
        .single();

      if (creditErr || !creditData) {
        console.warn('Failed to auto-create credit agreement:', creditErr);
        continue;
      }

      // 3. Insert customer_credit_installments
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

      // 4. Update customer debt balance if needed
      if (customer.id && Number(customer.debt_balance || 0) < parsed.contractTotal) {
        await supabase
          .from('customers')
          .update({ debt_balance: Math.max(Number(customer.debt_balance || 0), parsed.contractTotal) })
          .eq('id', customer.id);
      }

      syncedCount++;
    }

    return { success: true, syncedCount };
  } catch (err) {
    console.error('syncCreditSales exception:', err);
    return { success: false, syncedCount: 0, error: err };
  }
}
