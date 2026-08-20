import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Plus, Save, Image as ImageIcon, Upload, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useUser } from '../../core/UserContext';
import { supabase } from '../../supabaseClient';
import Dropdown from '../../components/Common/Dropdown';
import ModalPortal from '../../components/Common/ModalPortal';

import { formatCategoriesHierarchically } from './categoryUtils';

const AddProductModal = ({ isOpen, onClose, categories, suppliers = [], onProductAdded, initialCategoryId = null, warehouseId }) => {
  const { t, i18n } = useTranslation();
  
  // Format categories for hierarchical dropdown
  const hierarchicalCategories = React.useMemo(() => 
    formatCategoriesHierarchically(categories, null, t), 
    [categories, t]
  );

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const { profile } = useUser();
  const [settings, setSettings] = useState(null);
  const [availableUnits, setAvailableUnits] = useState(['pcs', 'kg', 'liter', 'g', 'ml', 'pack', 'bottle', 'm', 'm2']);
  
  React.useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem('merkez_warehouse_settings');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setSettings(parsed);
          let initialBarcode = '';
          if (parsed.autoGenerateBarcode) {
            initialBarcode = '200' + Math.floor(1000000000 + Math.random() * 9000000000).toString();
          }

          if (parsed.availableUnits && parsed.availableUnits.length > 0) {
            setAvailableUnits(parsed.availableUnits);
          }

          setFormData(prev => ({ 
            ...prev, 
            critical_stock: parsed.lowStockThreshold || '5',
            barcode: prev.barcode || initialBarcode,
            category_id: initialCategoryId || '',
            unit: parsed.defaultUnit || (parsed.availableUnits && parsed.availableUnits[0]) || 'pcs'
          }));
        } catch (e) {}
      } else {
        setFormData(prev => ({ 
          ...prev, 
          category_id: initialCategoryId || ''
        }));
      }
    } else {
      setFormData({
        name: '', price: '', purchase_price: '', factory_price: '', additional_info: '', barcode: '',
        category_id: '', stock_quantity: '0', critical_stock: '5', supplier_id: '', unit: 'pcs', color: ''
      });
    }
  }, [isOpen, initialCategoryId]);
  
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    purchase_price: '',
    factory_price: '',
    additional_info: '',
    barcode: '',
    category_id: '',
    stock_quantity: '0',
    critical_stock: '5',
    supplier_id: '',
    unit: 'pcs',
    color: ''
  });

  if (!isOpen) return null;

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file) => {
    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.price) return;
    
    setLoading(true);
    
    let imageUrl = '';
    if (imageFile) {
      imageUrl = await uploadImage(imageFile);
    }

    let finalBarcode = formData.barcode?.trim();
    if (!finalBarcode && settings?.autoGenerateBarcode) {
      finalBarcode = '200' + Math.floor(1000000000 + Math.random() * 9000000000).toString();
    } else if (!finalBarcode) {
      finalBarcode = Math.floor(1000000000000 + Math.random() * 9000000000000).toString();
    }

    let desc = '';
    if (formData.factory_price) desc += 'Zavod qiyməti: ' + formData.factory_price.trim() + '\n';
    if (formData.additional_info) desc += 'Əlavə məlumat: ' + formData.additional_info.trim();

    let newProduct = { 
         name: formData.name, 
         price: parseFloat(formData.price), 
         purchase_price: parseFloat(formData.purchase_price || 0),
         description: desc.trim() || null,
         barcode: finalBarcode,
         category_id: formData.category_id || null,
         stock_quantity: parseFloat(formData.stock_quantity || 0),
         critical_stock: parseFloat(formData.critical_stock || 5),
         image_url: imageUrl,
         supplier_id: formData.supplier_id || null,
         user_id: profile?.id,
         warehouse_id: warehouseId,
         unit: formData.unit,
         color: formData.color
    };

    let res = await supabase.from('products').insert([newProduct]).select('*, categories(name)');
    let data = res.data;
    let error = res.error;

    if (error && (error.message.includes('color') || error.message.includes('unit') || error.message.includes('schema cache'))) {
      delete newProduct.unit;
      delete newProduct.color;
      let fallbackRes = await supabase.from('products').insert([newProduct]).select('*, categories(name)');
      data = fallbackRes.data;
      error = fallbackRes.error;
      if (!error) {
        toast.success(t('warehouse.productAdded') || 'Товар добавлен', { icon: '⚠️' });
        toast('Новые колонки (Цвет / Unit) отсутствуют в БД. Выполните SQL-запрос!', { duration: 6000, icon: '💡' });
      }
    }

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    if (!data || data.length === 0) {
      toast.error(t('warehouse.noPermission') || 'У вас нет прав для добавления товаров на этот склад');
      setLoading(false);
      return;
    }

    if (!error && newProduct.unit !== undefined) {
      toast.success(t('warehouse.productAdded') || 'Товар успешно добавлен');
    }
    if (!error && data) {
      onProductAdded();
      onClose();
      setImageFile(null);
      setImagePreview(null);
    }
    setLoading(false);
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-merkez-blue/10 flex items-center justify-center">
              <Plus className="w-6 h-6 text-merkez-blue" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">{t('warehouse.addProduct')}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-xl hover:bg-gray-100">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 gap-5">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('warehouse.thName')}</label>
              <input
                type="text"
                required
                className="w-full px-5 py-3 bg-gray-50 border border-gray-100 hover:border-merkez-blue hover:bg-white transition-all rounded-xl text-sm focus:outline-none focus:border-merkez-blue focus:bg-white shadow-sm"
                placeholder={t('warehouse.productNamePlaceholder') || 'Məhsul adı və ya seriya...'}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('warehouse.supplier')}</label>
                <Dropdown 
                  value={formData.supplier_id}
                  onChange={val => setFormData({ ...formData, supplier_id: val })}
                  buttonClassName="rounded-xl px-5 py-3"
                  options={[
                    { value: '', label: t('warehouse.selectSupplier') || 'Tədarükçü seçin' },
                    ...suppliers.map(s => ({ value: s.id, label: s.name }))
                  ]}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('warehouse.thCategory')}</label>
                <Dropdown 
                  value={formData.category_id}
                  onChange={val => setFormData({ ...formData, category_id: val })}
                  buttonClassName="rounded-xl px-5 py-3"
                  options={[
                    { value: '', label: t('warehouse.selectCategory') || 'Kateqoriya seçin' },
                    ...hierarchicalCategories.map(cat => ({ value: cat.id, label: cat.label }))
                  ]}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">ZAVOD QİYMƏTİ</label>
                <input
                  type="text"
                  placeholder="məs. $15.00 / 12 ₼"
                  className="w-full px-5 py-3 bg-gray-50 border border-gray-100 hover:border-merkez-blue hover:bg-white transition-all rounded-xl text-sm focus:outline-none focus:border-merkez-blue focus:bg-white shadow-sm font-bold"
                  value={formData.factory_price}
                  onChange={(e) => setFormData({ ...formData, factory_price: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('warehouse.thPurchasePrice')}</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">₼</span>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-100 hover:border-merkez-blue hover:bg-white transition-all rounded-xl text-sm focus:outline-none focus:border-merkez-blue focus:bg-white shadow-sm"
                    value={formData.purchase_price}
                    onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('warehouse.thPrice')}</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-merkez-blue text-sm font-bold">₼</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-100 hover:border-merkez-blue hover:bg-white transition-all rounded-xl text-sm focus:outline-none focus:border-merkez-blue focus:bg-white font-bold text-merkez-blue shadow-sm"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('warehouse.initialStock') || 'İlkin Stok'}</label>
                <input
                  type="number"
                  step="0.001"
                  className="w-full px-5 py-3 bg-gray-50 border border-gray-100 hover:border-merkez-blue hover:bg-white transition-all rounded-xl text-sm focus:outline-none focus:border-merkez-blue focus:bg-white shadow-sm font-bold"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('warehouse.criticalStock')}</label>
                <input
                  type="number"
                  step="0.001"
                  className="w-full px-5 py-3 bg-gray-50 border border-gray-100 hover:border-merkez-blue hover:bg-white transition-all rounded-xl text-sm focus:outline-none focus:border-merkez-blue focus:bg-white shadow-sm"
                  value={formData.critical_stock}
                  onChange={(e) => setFormData({ ...formData, critical_stock: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('warehouse.thUnit') || 'Vahid'}</label>
                <Dropdown 
                  value={formData.unit}
                  onChange={val => setFormData({ ...formData, unit: val })}
                  buttonClassName="rounded-xl px-5 py-3"
                  options={availableUnits.map(u => ({ value: u, label: t('restaurant.' + u) || u }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('warehouse.thBarcode')}</label>
                <input
                  type="text"
                  className="w-full px-5 py-3 bg-gray-50 border border-gray-100 hover:border-merkez-blue hover:bg-white transition-all rounded-xl text-sm focus:outline-none focus:border-merkez-blue focus:bg-white font-mono shadow-sm"
                  placeholder={settings?.autoGenerateBarcode ? "200... (Avto)" : "000000000"}
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{i18n.language === 'az' ? 'Rəng / Ölçü' : 'Цвет / Размер'}</label>
                <input 
                  type="text"
                  list="add-color-suggestions"
                  placeholder="məs. 4/4, BLACK, 40 CM, SILVER..."
                  value={formData.color}
                  onChange={e => setFormData({ ...formData, color: e.target.value })}
                  className="w-full px-5 py-3 bg-gray-50 border border-gray-100 hover:border-merkez-blue hover:bg-white transition-all rounded-xl text-sm focus:outline-none focus:border-merkez-blue focus:bg-white shadow-sm"
                />
                <datalist id="add-color-suggestions">
                  <option value="4/4" />
                  <option value="3/4" />
                  <option value="1/2" />
                  <option value="1/4" />
                  <option value="1/8" />
                  <option value="WHITE" />
                  <option value="BLACK" />
                  <option value="BROWN" />
                  <option value="BEIGE" />
                  <option value="SILVER" />
                  <option value="GOLD" />
                  <option value="RED" />
                  <option value="BLUE" />
                  <option value="STANDARD" />
                </datalist>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">ƏLAVƏ MƏLUMAT</label>
              <textarea
                rows={2}
                placeholder="məs. CƏLAL, Hədiyyə: MİZRAB, xüsusi qeydlər..."
                className="w-full px-5 py-3 bg-gray-50 border border-gray-100 hover:border-merkez-blue hover:bg-white transition-all rounded-xl text-sm focus:outline-none focus:border-merkez-blue focus:bg-white shadow-sm resize-none"
                value={formData.additional_info}
                onChange={(e) => setFormData({ ...formData, additional_info: e.target.value })}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-merkez-blue text-white py-3.5 rounded-xl text-sm font-bold hover:bg-blue-600 transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center disabled:opacity-50 mt-4 shrink-0"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <Save className="w-5 h-5 mr-2" />
            )}
            {t('warehouse.saveProduct')}
          </button>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
};

export default AddProductModal;
