import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../core/UserContext';
import { useTranslation } from 'react-i18next';
import { 
  ClipboardList, 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle, 
  Search, 
  Loader2, 
  AlertCircle,
  Eye,
  Edit3,
  ChevronLeft,
  RefreshCw,
  Copy
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const WarehouseStocktake = ({ warehouseId, warehouses, isRestaurantActive = false }) => {
  const { t } = useTranslation();
  const { profile } = useUser();
  
  // Views: 'list', 'create', 'edit'
  const [view, setView] = useState('list');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [stocktakes, setStocktakes] = useState([]);
  
  // Create/Edit form states
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(warehouseId || '');
  const [notes, setNotes] = useState('');
  const [auditType, setAuditType] = useState('product'); // 'product' or 'ingredient'
  const [auditItems, setAuditItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyDiscrepancies, setOnlyDiscrepancies] = useState(false);
  const [activeStocktakeId, setActiveStocktakeId] = useState(null);
  const [viewModeOnly, setViewModeOnly] = useState(false);

  // Personnel details
  const [staffList, setStaffList] = useState([]);
  const [checkedBy, setCheckedBy] = useState('');
  const [receivedBy, setReceivedBy] = useState('');
  const [handedOverBy, setHandedOverBy] = useState('');

  useEffect(() => {
    if (profile?.id) {
      fetchStaff();
    }
  }, [profile]);

  const fetchStaff = async () => {
    try {
      const { data } = await supabase
        .from('staff')
        .select('id, name')
        .eq('user_id', profile.id)
        .eq('status', 'Active')
        .order('name', { ascending: true });
      setStaffList(data || []);
    } catch (err) {
      console.error('Error fetching staff list:', err);
    }
  };

  useEffect(() => {
    if (profile?.id) {
      fetchStocktakes();
    }
  }, [profile, warehouseId]);

  const fetchStocktakes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('stocktakes')
        .select(`
          id,
          status,
          notes,
          created_at,
          warehouse_id,
          checked_by,
          received_by,
          handed_over_by
        `)
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // For each stocktake, fetch items to calculate total discrepancy cost
      const stocktakesWithCosts = await Promise.all((data || []).map(async (st) => {
        const { data: items } = await supabase
          .from('stocktake_items')
          .select('expected_quantity, actual_quantity, purchase_price')
          .eq('stocktake_id', st.id);

        const totalCost = (items || []).reduce((sum, item) => {
          const diff = parseFloat(item.actual_quantity || 0) - parseFloat(item.expected_quantity || 0);
          return sum + (diff * parseFloat(item.purchase_price || 0));
        }, 0);

        return {
          ...st,
          totalDiscrepancyCost: totalCost
        };
      }));

      setStocktakes(stocktakesWithCosts);
    } catch (err) {
      console.error('Error fetching stocktakes:', err);
      toast.error('Inventarlaşdırma siyahısı yüklənərkən xəta baş verdi: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  // Start new stocktake
  const handleNewStocktake = async () => {
    if (!selectedWarehouseId) {
      toast.error('Zəhmət olmasa anbar seçin');
      return;
    }
    
    setLoading(true);
    setView('create');
    setViewModeOnly(false);
    setActiveStocktakeId(null);
    setNotes('');
    setCheckedBy('');
    setReceivedBy('');
    setHandedOverBy('');
    
    try {
      // Fetch products or ingredients depending on type
      const table = auditType === 'product' ? 'products' : 'ingredients';
      const qtyField = auditType === 'product' ? 'stock_quantity' : 'quantity';
      const priceField = auditType === 'product' ? 'purchase_price' : 'cost_price';
      
      const { data: invItems } = await supabase
        .from(table)
        .select(`id, name, barcode, ${qtyField}, ${priceField}`)
        .eq('user_id', profile.id)
        .eq('warehouse_id', selectedWarehouseId)
        .eq('is_deleted', false)
        .order('name');

      const mapped = (invItems || []).map(item => ({
        item_id: item.id,
        name: item.name,
        barcode: item.barcode,
        expected_quantity: item[qtyField] || 0,
        actual_quantity: '', // user enters this
        purchase_price: item[priceField] || 0
      }));

      setAuditItems(mapped);
    } catch (err) {
      console.error(err);
      toast.error('Anbar məhsulları yüklənərkən xəta baş verdi: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  // Edit or View existing stocktake
  const handleLoadStocktake = async (st, viewOnly = false) => {
    setLoading(true);
    setView(viewOnly ? 'view' : 'edit');
    setViewModeOnly(viewOnly);
    setActiveStocktakeId(st.id);
    setSelectedWarehouseId(st.warehouse_id);
    setNotes(st.notes || '');
    setCheckedBy(st.checked_by || '');
    setReceivedBy(st.received_by || '');
    setHandedOverBy(st.handed_over_by || '');

    try {
      // 1. Fetch items saved inside the stocktake
      const { data: stItems, error: itemsError } = await supabase
        .from('stocktake_items')
        .select('*')
        .eq('stocktake_id', st.id);

      if (itemsError) throw itemsError;

      // 2. Fetch current details from inventory (to display name & barcode)
      // Since stocktake items might relate to products or ingredients, we figure out type
      const firstItem = stItems?.[0];
      const detectedType = firstItem?.ingredient_id ? 'ingredient' : 'product';
      setAuditType(detectedType);

      const inventoryTable = detectedType === 'product' ? 'products' : 'ingredients';
      const { data: inventoryData } = await supabase
        .from(inventoryTable)
        .select('id, name, barcode')
        .eq('user_id', profile.id)
        .eq('warehouse_id', st.warehouse_id)
        .eq('is_deleted', false);

      const mapped = (stItems || []).map(stItem => {
        const itemId = detectedType === 'product' ? stItem.product_id : stItem.ingredient_id;
        const invMatch = (inventoryData || []).find(i => i.id === itemId);
        return {
          item_id: itemId,
          name: invMatch ? invMatch.name : 'Silinmiş Məhsul',
          barcode: invMatch ? invMatch.barcode : '',
          expected_quantity: stItem.expected_quantity,
          actual_quantity: stItem.actual_quantity.toString(),
          purchase_price: stItem.purchase_price
        };
      });

      setAuditItems(mapped);
    } catch (err) {
      console.error(err);
      toast.error('Inventarlaşdırma detalları yüklənə bilmədi: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  // Autofill all actual quantities with expected quantities (convenience)
  const autofillAll = () => {
    setAuditItems(auditItems.map(item => ({
      ...item,
      actual_quantity: item.expected_quantity.toString()
    })));
    toast.success('Bütün miqdarlar gözlənilən miqdar ilə dolduruldu');
  };

  // Update single row input
  const handleQtyChange = (itemId, val) => {
    setAuditItems(auditItems.map(item => 
      item.item_id === itemId ? { ...item, actual_quantity: val } : item
    ));
  };

  // Filter items based on search and discrepancies
  const getFilteredItems = () => {
    return auditItems.filter(item => {
      // Search query filter
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (item.barcode && item.barcode.includes(searchQuery));
      
      if (!matchesSearch) return false;

      // Discrepancy filter
      if (onlyDiscrepancies) {
        const actualVal = parseFloat(item.actual_quantity);
        if (isNaN(actualVal)) return false;
        return actualVal !== parseFloat(item.expected_quantity);
      }

      return true;
    });
  };

  // Save stocktake document (draft or complete)
  const handleSave = async (isComplete = false) => {
    // Validation
    const filledItems = auditItems.filter(i => i.actual_quantity !== '');
    if (filledItems.length === 0) {
      toast.error('Ən azı bir məhsul üçün sayılan miqdar daxil edin');
      return;
    }

    setSubmitting(true);
    try {
      let docId = activeStocktakeId;

      if (!docId) {
        // Create new document header
        const { data: newDoc, error: docError } = await supabase
          .from('stocktakes')
          .insert({
            user_id: profile.id,
            warehouse_id: selectedWarehouseId,
            status: isComplete ? 'completed' : 'draft',
            notes: notes,
            checked_by: checkedBy || null,
            received_by: receivedBy || null,
            handed_over_by: handedOverBy || null
          })
          .select()
          .single();

        if (docError) throw docError;
        docId = newDoc.id;
      } else {
        // Update existing document header status and notes
        const { error: updateDocError } = await supabase
          .from('stocktakes')
          .update({
            status: isComplete ? 'completed' : 'draft',
            notes: notes,
            checked_by: checkedBy || null,
            received_by: receivedBy || null,
            handed_over_by: handedOverBy || null
          })
          .eq('id', docId);

        if (updateDocError) throw updateDocError;

        // Delete old items
        const { error: deleteOldError } = await supabase
          .from('stocktake_items')
          .delete()
          .eq('stocktake_id', docId);

        if (deleteOldError) throw deleteOldError;
      }

      // Insert all filled items
      const itemsToInsert = filledItems.map(item => {
        const actual = parseFloat(item.actual_quantity);
        const expected = parseFloat(item.expected_quantity);
        return {
          stocktake_id: docId,
          [auditType === 'product' ? 'product_id' : 'ingredient_id']: item.item_id,
          expected_quantity: expected,
          actual_quantity: actual,
          discrepancy: actual - expected,
          purchase_price: parseFloat(item.purchase_price || 0)
        };
      });

      const { error: insertItemsError } = await supabase
        .from('stocktake_items')
        .insert(itemsToInsert);

      if (insertItemsError) throw insertItemsError;

      // If completing, perform reconciliation and stock adjustments!
      if (isComplete) {
        const table = auditType === 'product' ? 'products' : 'ingredients';
        const qtyField = auditType === 'product' ? 'stock_quantity' : 'quantity';

        for (const item of filledItems) {
          const actual = parseFloat(item.actual_quantity);
          const expected = parseFloat(item.expected_quantity);
          const discrepancy = actual - expected;

          // 1. Update the actual inventory quantity
          const { error: updateInvError } = await supabase
            .from(table)
            .update({ [qtyField]: actual })
            .eq('id', item.item_id);

          if (updateInvError) throw updateInvError;

          // 2. Insert into warehouse_transactions if there is discrepancy
          if (discrepancy !== 0) {
            const { error: transError } = await supabase
              .from('warehouse_transactions')
              .insert({
                user_id: profile.id,
                [auditType === 'product' ? 'product_id' : 'ingredient_id']: item.item_id,
                warehouse_id: selectedWarehouseId,
                type: discrepancy > 0 ? 'in' : 'out',
                quantity: Math.abs(discrepancy),
                notes: `Inventarlaşdırma tənzimlənməsi (Sənəd ID: ${docId.substring(0, 8)})`
              });

            if (transError) throw transError;
          }
        }

        toast.success('Audit tamamlandı və anbar miqdarları tənzimləndi!');
      } else {
        toast.success('Qaralama uğurla saxlanıldı!');
      }

      setView('list');
      fetchStocktakes();
    } catch (err) {
      console.error(err);
      toast.error('Yadda saxlanarkən xəta baş verdi');
    } finally {
      setSubmitting(false);
    }
  };

  const getDiscrepancyTotals = () => {
    let surplus = 0;
    let shortage = 0;
    let count = 0;

    auditItems.forEach(item => {
      const actual = parseFloat(item.actual_quantity);
      if (isNaN(actual)) return;
      count++;
      const diff = actual - parseFloat(item.expected_quantity);
      const val = diff * parseFloat(item.purchase_price || 0);
      if (val > 0) {
        surplus += val;
      } else {
        shortage += Math.abs(val);
      }
    });

    return {
      surplus,
      shortage,
      net: surplus - shortage,
      count
    };
  };

  const deleteStocktakeDraft = async (id) => {
    if (!window.confirm('Bu qaralamanı silmək istədiyinizə əminsiniz?')) return;
    try {
      const { error } = await supabase
        .from('stocktakes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Qaralama silindi');
      fetchStocktakes();
    } catch (err) {
      console.error(err);
      toast.error('Silinmə xətası');
    }
  };

  if (loading && view === 'list') {
    return (
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 p-12 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-merkez-blue" />
      </div>
    );
  }

  const totals = getDiscrepancyTotals();
  const filteredItems = getFilteredItems();

  return (
    <div className="flex-1 space-y-6">
      {view === 'list' ? (
        <div className="space-y-6">
          {/* Header Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-6 rounded-3xl shadow-sm border border-gray-100 gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                <ClipboardList className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900 tracking-tight">Inventarlaşdırma (Stocktake)</h3>
                <p className="text-xs text-gray-500 font-medium">Anbar audit sənədlərinin siyahısı və tənzimlənməsi</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="w-48">
                <Dropdown 
                  value={selectedWarehouseId}
                  onChange={setSelectedWarehouseId}
                  options={[
                    { value: '', label: 'Anbar Seçin...' },
                    ...warehouses.map(w => ({ value: w.id, label: w.name }))
                  ]}
                />
              </div>
              
              <div className="flex gap-2">
                {isRestaurantActive && (
                  <select
                    value={auditType}
                    onChange={(e) => setAuditType(e.target.value)}
                    className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs font-bold text-gray-600 outline-none"
                  >
                    <option value="product">Məhsullar</option>
                    <option value="ingredient">İnqrediyentlər</option>
                  </select>
                )}

                <button
                  onClick={handleNewStocktake}
                  className="px-4 py-2 bg-merkez-blue text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center gap-1.5 shadow-md shadow-blue-600/10"
                >
                  <Plus className="w-4 h-4" />
                  Yeni Audit
                </button>
              </div>
            </div>
          </div>

          {/* List Table */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              {stocktakes.length === 0 ? (
                <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
                  <ClipboardList className="w-10 h-10 text-gray-200" />
                  <p className="text-xs font-bold">Hələ heç bir inventarlaşdırma audit sənədi yaradılmayıb.</p>
                </div>
              ) : (
                <table className="w-full min-w-[850px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-50 bg-gray-50/40">
                      <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Sənəd ID</th>
                      <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Tarix</th>
                      <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Anbar</th>
                      <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                      <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Fərq məbləği</th>
                      <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Heyət</th>
                      <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Qeydlər</th>
                      <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Əməliyyatlar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stocktakes.map((st) => (
                      <tr key={st.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="p-4 font-bold text-gray-900 text-xs">
                          #{st.id.substring(0, 8).toUpperCase()}
                        </td>
                        <td className="p-4 text-xs font-bold text-gray-500">
                          {new Date(st.created_at).toLocaleString()}
                        </td>
                        <td className="p-4 text-xs font-bold text-gray-700">
                          {warehouses.find(w => w.id === st.warehouse_id)?.name || 'Naməlum anbar'}
                        </td>
                        <td className="p-4">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            st.status === 'completed' 
                              ? 'bg-green-50 text-green-500 border border-green-100' 
                              : 'bg-yellow-50 text-yellow-600 border border-yellow-100'
                          }`}>
                            {st.status === 'completed' ? 'Tamamlanıb' : 'Qaralama'}
                          </span>
                        </td>
                        <td className={`p-4 text-xs font-bold text-right ${
                          st.totalDiscrepancyCost > 0 
                            ? 'text-green-500' 
                            : st.totalDiscrepancyCost < 0 
                              ? 'text-red-500' 
                              : 'text-gray-900'
                        }`}>
                          {st.totalDiscrepancyCost > 0 ? '+' : ''}₼{st.totalDiscrepancyCost.toFixed(2)}
                        </td>
                        <td className="p-4 text-xs font-medium text-gray-500 max-w-xs">
                          <div className="flex flex-col gap-0.5">
                            {st.checked_by && (
                              <span className="text-[10px] text-gray-400">
                                Yoxladı: <strong className="text-gray-600">{staffList.find(s => s.id === st.checked_by)?.name || '—'}</strong>
                              </span>
                            )}
                            {st.handed_over_by && (
                              <span className="text-[10px] text-gray-400">
                                Təhvil verdi: <strong className="text-gray-600">{staffList.find(s => s.id === st.handed_over_by)?.name || '—'}</strong>
                              </span>
                            )}
                            {st.received_by && (
                              <span className="text-[10px] text-gray-400">
                                Təhvil aldı: <strong className="text-gray-600">{staffList.find(s => s.id === st.received_by)?.name || '—'}</strong>
                              </span>
                            )}
                            {!st.checked_by && !st.handed_over_by && !st.received_by && <span className="text-gray-300">—</span>}
                          </div>
                        </td>
                        <td className="p-4 text-xs font-medium text-gray-500 max-w-xs truncate">
                          {st.notes || '-'}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex gap-2 justify-end">
                            {st.status === 'draft' ? (
                              <>
                                <button
                                  onClick={() => handleLoadStocktake(st, false)}
                                  className="p-1.5 hover:bg-amber-50 text-amber-500 rounded-lg transition-colors"
                                  title="Davam et"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => deleteStocktakeDraft(st.id)}
                                  className="p-1.5 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-lg transition-colors"
                                  title="Sil"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleLoadStocktake(st, true)}
                                className="p-1.5 hover:bg-gray-100 text-gray-500 rounded-lg transition-colors"
                                title="Bax"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Create or Edit stocktake document */
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setView('list')}
                className="p-2 hover:bg-gray-50 rounded-xl transition-colors text-gray-400 hover:text-gray-700"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <h3 className="text-md font-black text-gray-900 leading-none mb-1">
                  {viewModeOnly ? 'Auditin Detalları' : activeStocktakeId ? 'Auditi Redaktə Et' : 'Yeni Audit Sənədi'}
                </h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  {warehouses.find(w => w.id === selectedWarehouseId)?.name} • {auditType === 'product' ? 'Məhsullar' : 'İnqrediyentlər'}
                </p>
              </div>
            </div>
            
            {!viewModeOnly && (
              <button
                onClick={autofillAll}
                className="px-3.5 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-bold hover:bg-black transition-all"
              >
                Hamısını doldur
              </button>
            )}
          </div>

          {/* Live stats summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Sayılan məhsul çeşidi</p>
              <h4 className="text-lg font-black text-gray-900">{totals.count} / {auditItems.length}</h4>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-[9px] font-black text-green-500 uppercase tracking-widest mb-1">Artıq Qalan (Məbləğ)</p>
              <h4 className="text-lg font-black text-green-500">₼{totals.surplus.toFixed(2)}</h4>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-1">Əskik Gələn (Məbləğ)</p>
              <h4 className="text-lg font-black text-red-500">₼{totals.shortage.toFixed(2)}</h4>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Xalis fərq məbləği</p>
              <h4 className={`text-lg font-black ${totals.net > 0 ? 'text-green-500' : totals.net < 0 ? 'text-red-500' : 'text-gray-900'}`}>
                {totals.net > 0 ? '+' : ''}₼{totals.net.toFixed(2)}
              </h4>
            </div>
          </div>

          {/* Audit Rows Form */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Məhsul adı və ya barkoda görə axtar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 w-full border border-gray-100 rounded-xl text-xs font-bold outline-none focus:border-merkez-blue bg-gray-50/50 focus:bg-white transition-all"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox"
                  checked={onlyDiscrepancies}
                  onChange={(e) => setOnlyDiscrepancies(e.target.checked)}
                  className="rounded border-gray-300 text-merkez-blue focus:ring-merkez-blue"
                />
                <span className="text-xs font-bold text-gray-500">Yalnız fərqləri göstər</span>
              </label>
            </div>

            <div className="overflow-x-auto max-h-[50vh] overflow-y-auto custom-scrollbar">
              <table className="w-full min-w-[750px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-50 bg-gray-50/40 sticky top-0 z-10">
                    <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/40">Məhsul</th>
                    <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center bg-gray-50/40">Gözlənilən</th>
                    <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center bg-gray-50/40">Sayılan (Faktiki)</th>
                    <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center bg-gray-50/40">Fərq</th>
                    <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right bg-gray-50/40">Maya Dəyəri</th>
                    <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right bg-gray-50/40">Maya Fərqi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => {
                    const actualVal = parseFloat(item.actual_quantity);
                    const discrepancy = isNaN(actualVal) ? 0 : actualVal - parseFloat(item.expected_quantity);
                    const costDiff = discrepancy * parseFloat(item.purchase_price || 0);

                    return (
                      <tr key={item.item_id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-gray-900 text-sm">{item.name}</div>
                          {item.barcode && <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{item.barcode}</div>}
                        </td>
                        <td className="p-4 text-center font-bold text-gray-600 text-xs">
                          {item.expected_quantity}
                        </td>
                        <td className="p-4">
                          <div className="flex justify-center">
                            <input 
                              type="number"
                              disabled={viewModeOnly}
                              value={item.actual_quantity}
                              onChange={(e) => handleQtyChange(item.item_id, e.target.value)}
                              placeholder="0"
                              className="w-20 bg-gray-50 border border-gray-100 rounded-xl px-3 py-1.5 text-xs font-black text-center outline-none focus:border-merkez-blue focus:bg-white disabled:opacity-75 disabled:bg-gray-100"
                            />
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          {item.actual_quantity === '' ? (
                            <span className="text-gray-400 font-bold text-xs">-</span>
                          ) : (
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-black ${
                              discrepancy > 0 
                                ? 'bg-green-50 text-green-500 border border-green-100' 
                                : discrepancy < 0 
                                  ? 'bg-red-50 text-red-500 border border-red-100' 
                                  : 'bg-gray-50 text-gray-500 border border-gray-100'
                            }`}>
                              {discrepancy > 0 ? `+${discrepancy}` : discrepancy}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-xs font-bold text-gray-900 text-right">
                          ₼{(item.purchase_price || 0).toFixed(2)}
                        </td>
                        <td className={`p-4 text-xs font-bold text-right ${costDiff > 0 ? 'text-green-500' : costDiff < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                          {item.actual_quantity === '' ? '-' : `${costDiff > 0 ? '+' : ''}₼${costDiff.toFixed(2)}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes and Actions */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-5">
            {/* Personnel Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 border-b border-gray-50 pb-5">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
                  {i18n?.language === 'az' ? 'Yoxlayan (Təftiş edən)' : i18n?.language === 'ru' ? 'Кто проверил (Инспектор)' : 'Checked By'}
                </label>
                <Dropdown
                  value={checkedBy}
                  onChange={setCheckedBy}
                  disabled={viewModeOnly}
                  options={[
                    { value: '', label: i18n?.language === 'az' ? 'Seçilməyib...' : 'Не выбрано...' },
                    ...staffList.map(s => ({ value: s.id, label: s.name }))
                  ]}
                  buttonClassName="rounded-xl px-4 py-2.5 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
                  {i18n?.language === 'az' ? 'Təhvil verən' : i18n?.language === 'ru' ? 'Кто сдал' : 'Handed Over By'}
                </label>
                <Dropdown
                  value={handedOverBy}
                  onChange={setHandedOverBy}
                  disabled={viewModeOnly}
                  options={[
                    { value: '', label: i18n?.language === 'az' ? 'Seçilməyib...' : 'Не выбрано...' },
                    ...staffList.map(s => ({ value: s.id, label: s.name }))
                  ]}
                  buttonClassName="rounded-xl px-4 py-2.5 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
                  {i18n?.language === 'az' ? 'Təhvil alan (Qəbul edən)' : i18n?.language === 'ru' ? 'Кто принял' : 'Received By'}
                </label>
                <Dropdown
                  value={receivedBy}
                  onChange={setReceivedBy}
                  disabled={viewModeOnly}
                  options={[
                    { value: '', label: i18n?.language === 'az' ? 'Seçilməyib...' : 'Не выбрано...' },
                    ...staffList.map(s => ({ value: s.id, label: s.name }))
                  ]}
                  buttonClassName="rounded-xl px-4 py-2.5 text-xs font-bold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Audit Qeydləri</label>
              <textarea 
                value={notes}
                disabled={viewModeOnly}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Bu audit haqqında qeydlər daxil edin..."
                className="w-full bg-gray-50 border border-gray-100 text-gray-900 text-sm rounded-xl focus:ring-merkez-blue focus:border-merkez-blue block p-3 outline-none font-medium h-20 resize-none shadow-sm disabled:opacity-75"
              />
            </div>

            {!viewModeOnly && (
              <div className="flex gap-4 pt-2">
                <button
                  onClick={() => setView('list')}
                  className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                >
                  Ləğv et
                </button>
                
                <button
                  onClick={() => handleSave(false)}
                  disabled={submitting}
                  className="flex-1 py-3.5 bg-gray-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-gray-200"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Qaralamanı saxla
                </button>

                <button
                  onClick={() => handleSave(true)}
                  disabled={submitting}
                  className="flex-1 py-3.5 bg-merkez-green text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-green-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Auditi Tamamla
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Simple Dropdown helper wrapper in case main UI Dropdown differs
const Dropdown = ({ value, onChange, options, disabled }) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full bg-gray-50 border border-gray-100 text-gray-900 text-xs rounded-xl focus:ring-merkez-blue focus:border-merkez-blue block p-2.5 outline-none font-bold shadow-sm transition-all disabled:opacity-75"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
};

export default WarehouseStocktake;
