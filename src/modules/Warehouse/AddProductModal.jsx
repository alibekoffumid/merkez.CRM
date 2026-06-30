import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Plus, Save, Image as ImageIcon, Upload, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useUser } from '../../core/UserContext';
import { supabase } from '../../supabaseClient';
import Dropdown from '../../components/Common/Dropdown';
import ModalPortal from '../../components/Common/ModalPortal';

import { formatCategoriesHierarchically } from './categoryUtils';

const AddProductModal = ({ isOpen, onClose, categories, suppliers = [], onProductAdded, initialCategoryId, warehouseId }) => {
  const { t } = useTranslation();
  
  // Format categories for hierarchical dropdown
  const hierarchicalCategories = React.useMemo(() => 
    formatCategoriesHierarchically(categories), 
    [categories]
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
            const prefix = parsed.barcodePrefix || '';
            const randomNum = Math.floor(100000 + Math.random() * 900000);
            initialBarcode = `${prefix}${randomNum}`;
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
        name: '', price: '', purchase_price: '', barcode: '',
        category_id: '', stock_quantity: '0', critical_stock: '5', supplier_id: '', unit: 'pcs'
      });
    }
  }, [isOpen, initialCategoryId]);
  
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    purchase_price: '',
    barcode: '',
    category_id: '',
    stock_quantity: '0',
    critical_stock: '5',
    supplier_id: '',
    unit: 'pcs'
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
    if (!formData.name || !formData.price || !formData.category_id) return;
    
    setLoading(true);
    
    let imageUrl = '';
    if (imageFile) {
      imageUrl = await uploadImage(imageFile);
    }

    let finalBarcode = formData.barcode?.trim();
    if (!finalBarcode && settings?.autoGenerateBarcode) {
      const prefix = settings.barcodePrefix || '';
      const randomNum = Math.floor(100000 + Math.random() * 900000);
      finalBarcode = `${prefix}${randomNum}`;
    }

     const { data, error } = await supabase
       .from('products')
       .insert([{ 
         name: formData.name, 
         price: parseFloat(formData.price), 
         purchase_price: parseFloat(formData.purchase_price || 0),
         barcode: finalBarcode,
         category_id: formData.category_id,
         stock_quantity: parseFloat(formData.stock_quantity || 0),
         critical_stock: parseFloat(formData.critical_stock || 5),
         image_url: imageUrl,
         supplier_id: formData.supplier_id || null,
         user_id: profile?.id,
         warehouse_id: warehouseId,
         unit: formData.unit
       }])
      .select('*, categories(name)');

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    if (!error && data) {
      onProductAdded();
      onClose();
      setImageFile(null);
      setImagePreview(null);
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 flex flex-col"
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

        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto max-h-[75vh] custom-scrollbar">
          <div className="grid grid-cols-1 gap-5">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('warehouse.thName')}</label>
              <input
                type="text"
                required
                className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm focus:outline-none focus:border-merkez-blue focus:bg-white transition-all shadow-sm"
                placeholder={t('warehouse.productNamePlaceholder')}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('warehouse.thCategory')}</label>
                <Dropdown 
                  value={formData.category_id}
                  onChange={val => setFormData({ ...formData, category_id: val })}
                  options={[
                    { value: '', label: t('warehouse.selectCategory') },
                    ...hierarchicalCategories.map(cat => ({ value: cat.id, label: cat.label }))
                  ]}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('warehouse.thUnit') || 'Ед. измерения'}</label>
                <Dropdown 
                  value={formData.unit}
                  onChange={val => setFormData({ ...formData, unit: val })}
                  options={availableUnits.map(u => ({ value: u, label: t('restaurant.' + u) || u }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('warehouse.thPurchasePrice')}</label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₼</span>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full pl-10 pr-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm focus:outline-none focus:border-merkez-blue focus:bg-white transition-all shadow-sm"
                    value={formData.purchase_price}
                    onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('warehouse.thPrice')}</label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-merkez-blue text-sm font-bold">₼</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="w-full pl-10 pr-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm focus:outline-none focus:border-merkez-blue focus:bg-white transition-all shadow-sm font-bold text-merkez-blue"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('warehouse.initialStock')}</label>
                <input
                  type="number"
                  step="0.001"
                  className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm focus:outline-none focus:border-merkez-blue focus:bg-white transition-all shadow-sm"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('warehouse.criticalStock')}</label>
                <input
                  type="number"
                  step="0.001"
                  className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm focus:outline-none focus:border-merkez-blue focus:bg-white transition-all shadow-sm"
                  value={formData.critical_stock}
                  onChange={(e) => setFormData({ ...formData, critical_stock: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('warehouse.thBarcode')}</label>
                <input
                  type="text"
                  className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm focus:outline-none focus:border-merkez-blue focus:bg-white transition-all shadow-sm font-mono"
                  placeholder={settings?.autoGenerateBarcode ? `${settings.barcodePrefix || ''}XXXXXX (Авто)` : "000000000"}
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('warehouse.supplier')}</label>
                <Dropdown 
                  value={formData.supplier_id}
                  onChange={val => setFormData({ ...formData, supplier_id: val })}
                  options={[
                    { value: '', label: t('warehouse.selectSupplier') || 'Select Supplier' },
                    ...suppliers.map(s => ({ value: s.id, label: s.name }))
                  ]}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-merkez-blue text-white py-4 rounded-[1.5rem] text-sm font-bold hover:bg-blue-600 transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center disabled:opacity-50 mt-4"
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
