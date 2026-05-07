import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Save, Image as ImageIcon, Upload, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useUser } from '../../core/UserContext';
import { supabase } from '../../supabaseClient';
import Dropdown from '../../components/Common/Dropdown';

const EditProductModal = ({ isOpen, onClose, product, categories, onProductUpdated }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [deleteImage, setDeleteImage] = useState(false);
  const { profile } = useUser();
  
  const [formData, setFormData] = useState({ 
    name: '', 
    price: '', 
    purchase_price: '',
    barcode: '',
    category_id: '',
    stock_quantity: '',
    critical_stock: ''
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        price: product.price || '',
        purchase_price: product.purchase_price || '',
        barcode: product.barcode || '',
        category_id: product.category_id || '',
        stock_quantity: product.stock_quantity?.toString() || '0',
        critical_stock: product.critical_stock?.toString() || '5'
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

    const { error } = await supabase
      .from('products')
      .update({
        name: formData.name,
        price: parseFloat(formData.price),
        purchase_price: parseFloat(formData.purchase_price || 0),
        barcode: formData.barcode,
        category_id: formData.category_id || null,
        stock_quantity: parseFloat(formData.stock_quantity || 0),
        critical_stock: parseFloat(formData.critical_stock || 5),
        image_url: finalImageUrl
      })
      .eq('id', product.id)
      .eq('user_id', profile?.id);

    if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
    }

    setLoading(false);
    if (!error) {
      onProductUpdated();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 flex flex-col my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50 shrink-0">
          <h3 className="text-xl font-bold text-gray-900">{t('warehouse.editProduct')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto custom-scrollbar">
          <div className="flex flex-col items-center justify-center">
            <label className="block text-sm font-bold text-gray-700 mb-2 w-full">{t('warehouse.productImage')}</label>
            <div 
              onClick={() => fileInputRef.current.click()}
              className="relative w-full h-40 border-2 border-dashed border-gray-100 rounded-2xl hover:border-merkez-blue hover:bg-blue-50/50 transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden group"
            >
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-sm font-bold gap-4">
                    <div className="flex items-center"><Upload className="w-5 h-5 mr-2" /> {t('warehouse.changeImage')}</div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setImagePreview(null); setImageFile(null); setDeleteImage(true); }} 
                      className="p-2 bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
                      title="Remove Image"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center text-gray-400 group-hover:text-merkez-blue">
                  {uploading ? (
                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
                  ) : (
                    <>
                      <ImageIcon className="w-10 h-10 mb-2" />
                      <p className="text-xs font-medium">{t('warehouse.uploadImage')}</p>
                    </>
                  )}
                </div>
              )}
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">{t('warehouse.thName')}</label>
              <input
                type="text"
                required
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:border-merkez-blue transition-all"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">{t('warehouse.thBarcode')}</label>
              <input
                type="text"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:border-merkez-blue transition-all"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">{t('warehouse.thPurchasePrice')}</label>
              <input
                type="number"
                step="0.01"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:border-merkez-blue transition-all"
                value={formData.purchase_price}
                onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">{t('warehouse.thPrice')}</label>
              <input
                type="number"
                step="0.01"
                required
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:border-merkez-blue transition-all font-bold text-merkez-blue"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">{t('warehouse.thStock')}</label>
              <input
                type="number"
                step="0.001"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:border-merkez-blue transition-all"
                value={formData.stock_quantity}
                onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">{t('warehouse.criticalStock')}</label>
              <input
                type="number"
                step="0.001"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:border-merkez-blue transition-all"
                value={formData.critical_stock}
                onChange={(e) => setFormData({ ...formData, critical_stock: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">{t('warehouse.thCategory')}</label>
            <Dropdown 
              value={formData.category_id}
              onChange={val => setFormData({ ...formData, category_id: val })}
              options={[
                { value: '', label: t('warehouse.selectCategory') },
                ...categories.map(cat => ({ value: cat.id, label: cat.name }))
              ]}
            />
          </div>

          <button
            type="submit"
            disabled={loading || uploading}
            className="w-full bg-merkez-blue text-white py-3 rounded-xl text-sm font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
            {t('common.saveChanges')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditProductModal;
