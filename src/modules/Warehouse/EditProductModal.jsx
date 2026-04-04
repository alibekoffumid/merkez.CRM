import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Save, Image as ImageIcon, Upload, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '../../supabaseClient';

const EditProductModal = ({ isOpen, onClose, product, categories, onProductUpdated }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [deleteImage, setDeleteImage] = useState(false);
  
  const [formData, setFormData] = useState({ name: '', price: '', category_id: '' });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        price: product.price || '',
        category_id: product.category_id || ''
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
        category_id: formData.category_id || null,
        image_url: finalImageUrl
      })
      .eq('id', product.id);

    setLoading(false);
    if (!error) {
      onProductUpdated();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-xl font-bold text-gray-900">{t('warehouse.editProduct')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex flex-col items-center justify-center">
            <label className="block text-sm font-semibold text-gray-700 mb-2 w-full">{t('warehouse.productImage')}</label>
            <div 
              onClick={() => fileInputRef.current.click()}
              className="relative w-full h-40 border-2 border-dashed border-gray-200 rounded-xl hover:border-merkez-blue hover:bg-blue-50/50 transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden group"
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
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageChange} 
              accept="image/*" 
              className="hidden" 
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{t('warehouse.productName')}</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 outline-none focus:border-merkez-blue focus:ring-1 focus:ring-merkez-blue transition-colors shadow-sm text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t('warehouse.productPrice')}</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.price}
                onChange={e => setFormData({ ...formData, price: e.target.value })}
                className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 outline-none focus:border-merkez-blue focus:ring-1 focus:ring-merkez-blue transition-colors shadow-sm text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t('warehouse.thCategory')}</label>
              <select
                value={formData.category_id}
                onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 outline-none focus:border-merkez-blue focus:ring-1 focus:ring-merkez-blue transition-colors shadow-sm text-sm"
              >
                <option value="">{t('warehouse.selectCategory')}</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="pt-4 border-t border-gray-100 mt-6 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={loading || uploading} className="px-5 py-2.5 text-sm font-bold text-white bg-merkez-blue rounded-lg hover:bg-blue-600 transition-colors shadow-md flex items-center">
              {loading ? t('common.loading') : <><Save className="w-4 h-4 mr-2" /> {t('warehouse.saveChanges')}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProductModal;
