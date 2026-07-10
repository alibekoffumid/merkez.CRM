import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Save, Image as ImageIcon, Upload, Loader2, Trash2, Pencil } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useUser } from '../../core/UserContext';
import { supabase } from '../../supabaseClient';
import Dropdown from '../../components/Common/Dropdown';
import ModalPortal from '../../components/Common/ModalPortal';

import { formatCategoriesHierarchically } from './categoryUtils';

const EditProductModal = ({ isOpen, onClose, product, categories, suppliers = [], onProductUpdated }) => {
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
  const [deleteImage, setDeleteImage] = useState(false);
  const { profile } = useUser();
  const [availableUnits, setAvailableUnits] = useState(['pcs', 'kg', 'liter', 'g', 'ml', 'pack', 'bottle', 'm', 'm2']);
  
  const [formData, setFormData] = useState({ 
    name: '', 
    price: '', 
    purchase_price: '',
    barcode: '',
    category_id: '',
    stock_quantity: '',
    critical_stock: '',
    supplier_id: '',
    unit: 'pcs'
  });

  useEffect(() => {
    if (product) {
      const saved = localStorage.getItem('merkez_warehouse_settings');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.availableUnits && parsed.availableUnits.length > 0) {
            setAvailableUnits(parsed.availableUnits);
          }
        } catch (e) {}
      }
      setFormData({
        name: product.name || '',
        price: product.price || '',
        purchase_price: product.purchase_price || '',
        barcode: product.barcode || '',
        category_id: product.category_id || '',
        stock_quantity: product.stock_quantity?.toString() || '0',
        critical_stock: product.critical_stock?.toString() || '5',
        supplier_id: product.supplier_id || '',
        unit: product.unit || 'pcs'
      });
      setImagePreview(product.image_url || null);
      setImageFile(null);
      setDeleteImage(false);
    }
  }, [product]);

  if (!isOpen || !product) return null;

  if (!isOpen || !product) return null;

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setDeleteImage(false);
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

    let finalImageUrl = product.image_url;
    
    if (deleteImage) {
        finalImageUrl = '';
    } else if (imageFile) {
        const uploadedUrl = await uploadImage(imageFile);
        if (uploadedUrl) finalImageUrl = uploadedUrl;
    }

    const { data, error } = await supabase
      .from('products')
      .update({
        name: formData.name,
        price: parseFloat(formData.price),
        purchase_price: parseFloat(formData.purchase_price || 0),
        barcode: formData.barcode,
        category_id: formData.category_id || null,
        stock_quantity: parseFloat(formData.stock_quantity || 0),
        critical_stock: parseFloat(formData.critical_stock || 5),
        image_url: finalImageUrl,
        supplier_id: formData.supplier_id || null,
        unit: formData.unit
      })
      .eq('id', product.id)
      .select();

    if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
    }

    if (!data || data.length === 0) {
        toast.error(t('warehouse.noProductEditPermission'));
        setLoading(false);
        return;
    }

    toast.success(t('warehouse.productUpdated') || 'Товар обновлен');
    setLoading(false);
    onProductUpdated();
    onClose();
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
              <Pencil className="w-6 h-6 text-merkez-blue" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">{t('warehouse.editProduct')}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-xl hover:bg-gray-100">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 gap-5">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('warehouse.thName')}</label>
              <input
                type="text"
                required
                className="w-full px-5 py-3 bg-gray-50 border border-gray-100 hover:border-merkez-blue hover:bg-white transition-all rounded-xl text-sm focus:outline-none focus:border-merkez-blue focus:bg-white shadow-sm"
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
                  buttonClassName="rounded-xl px-5 py-3"
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
                  buttonClassName="rounded-xl px-5 py-3"
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
                    className="w-full pl-10 pr-5 py-3 bg-gray-50 border border-gray-100 hover:border-merkez-blue hover:bg-white transition-all rounded-xl text-sm focus:outline-none focus:border-merkez-blue focus:bg-white shadow-sm"
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
                    className="w-full pl-10 pr-5 py-3 bg-gray-50 border border-gray-100 hover:border-merkez-blue hover:bg-white transition-all rounded-xl text-sm focus:outline-none focus:border-merkez-blue focus:bg-white font-bold text-merkez-blue shadow-sm"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('warehouse.thStock')}</label>
                <input
                  type="number"
                  step="0.001"
                  className="w-full px-5 py-3 bg-gray-50 border border-gray-100 hover:border-merkez-blue hover:bg-white transition-all rounded-xl text-sm focus:outline-none focus:border-merkez-blue focus:bg-white shadow-sm"
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
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('warehouse.thBarcode')}</label>
                <input
                  type="text"
                  className="w-full px-5 py-3 bg-gray-50 border border-gray-100 hover:border-merkez-blue hover:bg-white transition-all rounded-xl text-sm focus:outline-none focus:border-merkez-blue focus:bg-white font-mono shadow-sm"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('warehouse.supplier')}</label>
                <Dropdown 
                  value={formData.supplier_id}
                  onChange={val => setFormData({ ...formData, supplier_id: val })}
                  buttonClassName="rounded-xl px-5 py-3"
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
            className="w-full bg-merkez-blue text-white py-3.5 rounded-xl text-sm font-bold hover:bg-blue-600 transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center disabled:opacity-50 mt-4"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
            {t('common.saveChanges')}
          </button>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
};

export default EditProductModal;
