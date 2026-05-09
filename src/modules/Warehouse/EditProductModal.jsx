import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Save, Image as ImageIcon, Upload, Loader2, Trash2, Pencil } from 'lucide-react';
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
        image_url: finalImageUrl
      })
      .eq('id', product.id)
      .select();

    if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
    }

    if (!data || data.length === 0) {
        toast.error('У вас нет прав на редактирование этого товара или он не найден');
        setLoading(false);
        return;
    }

    toast.success(t('warehouse.productUpdated') || 'Товар обновлен');
    setLoading(false);
    onProductUpdated();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 flex flex-col"
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

        <form onSubmit={handleSubmit} className="p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Left side: Image */}
            <div className="lg:col-span-5 space-y-4">
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">{t('warehouse.productImage')}</label>
              <div 
                onClick={() => fileInputRef.current.click()}
                className="relative aspect-square border-2 border-dashed border-gray-200 rounded-[2rem] hover:border-merkez-blue hover:bg-blue-50/50 transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden group shadow-inner"
              >
                {imagePreview ? (
                  <>
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-sm font-bold gap-4 backdrop-blur-sm">
                      <div className="flex items-center"><Upload className="w-6 h-6 mr-2" /> {t('warehouse.changeImage')}</div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setImagePreview(null); setImageFile(null); setDeleteImage(true); }} 
                        className="p-3 bg-red-500 rounded-2xl hover:bg-red-600 transition-colors shadow-lg"
                        title="Remove Image"
                      >
                        <Trash2 className="w-6 h-6" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center text-gray-400 group-hover:text-merkez-blue p-8 text-center">
                    {uploading ? (
                      <Loader2 className="w-10 h-10 animate-spin mb-3" />
                    ) : (
                      <>
                        <div className="w-16 h-16 rounded-3xl bg-gray-50 flex items-center justify-center mb-4 group-hover:bg-white group-hover:shadow-lg transition-all">
                          <ImageIcon className="w-8 h-8" />
                        </div>
                        <p className="text-sm font-bold mb-1">{t('warehouse.uploadImage')}</p>
                        <p className="text-[10px] text-gray-400">JPG, PNG up to 5MB</p>
                      </>
                    )}
                  </div>
                )}
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
            </div>

            {/* Right side: Details */}
            <div className="lg:col-span-7 space-y-6">
              <div className="grid grid-cols-1 gap-5">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('warehouse.thName')}</label>
                  <input
                    type="text"
                    required
                    className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm focus:outline-none focus:border-merkez-blue focus:bg-white transition-all shadow-sm"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('warehouse.thBarcode')}</label>
                    <input
                      type="text"
                      className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm focus:outline-none focus:border-merkez-blue focus:bg-white transition-all shadow-sm font-mono"
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('warehouse.thCategory')}</label>
                    <Dropdown 
                      value={formData.category_id}
                      onChange={val => setFormData({ ...formData, category_id: val })}
                      options={[
                        { value: '', label: t('warehouse.selectCategory') },
                        ...categories.map(cat => ({ value: cat.id, label: cat.name }))
                      ]}
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
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('warehouse.thStock')}</label>
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
              </div>

              <button
                type="submit"
                disabled={loading || uploading}
                className="w-full bg-merkez-blue text-white py-4 rounded-[1.5rem] text-sm font-bold hover:bg-blue-600 transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                {t('common.saveChanges')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProductModal;
