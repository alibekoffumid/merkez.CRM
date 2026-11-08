import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Save, Image as ImageIcon, Upload, Loader2, Trash2, Pencil, ChevronDown } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useUser } from '../../core/UserContext';
import { supabase } from '../../supabaseClient';
import Dropdown from '../../components/Common/Dropdown';
import ModalPortal from '../../components/Common/ModalPortal';

import { formatCategoriesHierarchically, getSupplierCurrency, CURRENCY_OPTIONS, getCurrencySymbol } from './categoryUtils';
import ProductCharacteristicsEditor from './ProductCharacteristicsEditor';
import { 
  parseProductAttributes, 
  cleanAttributesForSave, 
  formatAttributesForDescription, 
  extractAdditionalInfo 
} from './productAttributesHelper';

const EditProductModal = ({ isOpen, onClose, product, categories, suppliers = [], onProductUpdated }) => {
  const { t, i18n } = useTranslation();

  const selectedSupplier = (suppliers || []).find(s => s.id === (product?.supplier_id || ''));
  const supplierCurrency = getSupplierCurrency(selectedSupplier?.name || selectedSupplier?.company_name);

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
  const [deleteImage, setDeleteImage] = useState(false);
  const { profile, currentStaff } = useUser();
  const canSeeCostAndFactoryPrices = !currentStaff || currentStaff?.role === 'Admin' || currentStaff?.role?.toLowerCase() === 'admin' || currentStaff?.role?.toLowerCase() === 'owner';
  const isAdmin = !currentStaff || currentStaff?.role === 'Manager' || currentStaff?.role === 'Admin';
  const [availableUnits, setAvailableUnits] = useState(['pcs', 'kg', 'liter', 'g', 'ml', 'pack', 'bottle', 'm', 'm2']);
  const [factoryCurrency, setFactoryCurrency] = useState('USD');

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    purchase_price: '',
    factory_price: '',
    additional_info: '',
    barcode: '',
    category_id: '',
    stock_quantity: '',
    critical_stock: '',
    supplier_id: '',
    unit: 'pcs',
    color: ''
  });
  const [attributes, setAttributes] = useState([]);

  useEffect(() => {
    if (product) {
      const saved = localStorage.getItem('merkez_warehouse_settings');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.availableUnits && parsed.availableUnits.length > 0) {
            setAvailableUnits(parsed.availableUnits);
          }
        } catch (e) { }
      }

      const desc = product.description || '';
      let factoryPrice = '';
      let detectedCurrency = 'USD';
      if (canSeeCostAndFactoryPrices) {
        if (desc.includes('Zavod qiyməti:')) {
          factoryPrice = desc.split('Zavod qiyməti:')[1].split('\n')[0].trim();
        } else if (desc.includes('Zavod qiym?ti:')) {
          factoryPrice = desc.split('Zavod qiym?ti:')[1].split('\n')[0].trim();
        }
      }

      if (factoryPrice.includes('₼') || factoryPrice.toUpperCase().includes('AZN')) {
        detectedCurrency = 'AZN';
      } else if (
        factoryPrice.includes('¥') ||
        factoryPrice.includes('￥') ||
        factoryPrice.toUpperCase().includes('UAN') ||
        factoryPrice.toUpperCase().includes('CNY')
      ) {
        detectedCurrency = 'UAN';
      } else if (factoryPrice.includes('₺') || factoryPrice.toUpperCase().includes('TRY') || factoryPrice.toUpperCase().includes('TL')) {
        detectedCurrency = 'TRY';
      } else if (factoryPrice.includes('$') || factoryPrice.toUpperCase().includes('USD')) {
        detectedCurrency = 'USD';
      } else if (selectedSupplier) {
        const supCurr = getSupplierCurrency(selectedSupplier.name || selectedSupplier.company_name);
        if (supCurr === '₼') detectedCurrency = 'AZN';
        else if (supCurr === '¥' || supCurr === '￥') detectedCurrency = 'UAN';
        else if (supCurr === '₺') detectedCurrency = 'TRY';
        else if (supCurr === '$') detectedCurrency = 'USD';
      }
      setFactoryCurrency(detectedCurrency);

      const cleanFactoryNum = factoryPrice.replace(/[₼$￥¥€₺\s]/g, '').trim();

      const additionalInfo = extractAdditionalInfo(desc);
      const parsedAttrs = parseProductAttributes(product);
      setAttributes(parsedAttrs);

      setFormData({
        name: product.name || '',
        price: product.price || '',
        purchase_price: canSeeCostAndFactoryPrices ? (product.purchase_price || '') : '',
        factory_price: cleanFactoryNum || factoryPrice,
        additional_info: additionalInfo,
        barcode: product.barcode || '',
        category_id: product.category_id || '',
        stock_quantity: product.stock_quantity?.toString() || '0',
        critical_stock: product.critical_stock?.toString() || '5',
        supplier_id: product.supplier_id || '',
        unit: product.unit || 'pcs',
        color: product.color || ''
      });
      setImagePreview(product.image_url || null);
      setImageFile(null);
      setDeleteImage(false);
    }
  }, [product, canSeeCostAndFactoryPrices]);

  useEffect(() => {
    if (formData.supplier_id) {
      const sup = (suppliers || []).find(s => s.id === formData.supplier_id);
      const supCurr = getSupplierCurrency(sup?.name || sup?.company_name);
      if (supCurr === '₼') setFactoryCurrency('AZN');
      else if (supCurr === '¥' || supCurr === '￥') setFactoryCurrency('UAN');
      else if (supCurr === '$') setFactoryCurrency('USD');
    }
  }, [formData.supplier_id, suppliers]);

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
      const ALLOWED_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
      const extMatch = String(file?.name || '').match(/\.([a-zA-Z0-9]+)$/);
      const fileExt = extMatch && ALLOWED_EXTS.includes(extMatch[1].toLowerCase()) ? extMatch[1].toLowerCase() : 'jpg';
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
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
    if (!isAdmin) {
      toast.error(i18n.language === 'az' ? 'Düzəliş etmək üçün admin hüququ lazımdır' : 'Для изменения требуются права администратора');
      return;
    }
    if (!formData.name || !formData.price) return;
    setLoading(true);

    let finalImageUrl = product.image_url;

    if (deleteImage) {
      finalImageUrl = '';
    } else if (imageFile) {
      const uploadedUrl = await uploadImage(imageFile);
      if (uploadedUrl) finalImageUrl = uploadedUrl;
    }

    const cleanAttrs = cleanAttributesForSave(attributes);
    let desc = '';
    if (canSeeCostAndFactoryPrices) {
      if (formData.factory_price && formData.factory_price.trim()) {
        const cleanNum = formData.factory_price.trim().replace(/[₼$￥¥€₺\s]/g, '');
        const sym = getCurrencySymbol(factoryCurrency);
        const valToSave = cleanNum ? `${sym}${cleanNum}` : formData.factory_price.trim();
        desc += 'Zavod qiyməti: ' + valToSave + '\n';
      }
    } else {
      // Preserve existing factory price note when non-admin edits
      const origDesc = product.description || '';
      const factoryLineMatch = origDesc.match(/Zavod qiym[ə\?]ti:[^\n]+/i);
      if (factoryLineMatch) desc += factoryLineMatch[0] + '\n';
    }
    if (formData.additional_info) desc += 'Əlavə məlumat: ' + formData.additional_info.trim() + '\n';
    const attrDesc = formatAttributesForDescription(cleanAttrs);
    if (attrDesc) desc += (desc ? '\n' : '') + attrDesc;

    let updatePayload = {
      name: formData.name,
      price: parseFloat(formData.price),
      barcode: formData.barcode,
      category_id: formData.category_id || null,
      stock_quantity: parseFloat(formData.stock_quantity || 0),
      critical_stock: parseFloat(formData.critical_stock || 5),
      description: desc.trim() || null,
      image_url: finalImageUrl,
      supplier_id: formData.supplier_id || null,
      unit: formData.unit,
      color: formData.color,
      attributes: cleanAttrs
    };

    if (canSeeCostAndFactoryPrices) {
      updatePayload.purchase_price = parseFloat(formData.purchase_price || 0);
    }

    let res = await supabase.from('products').update(updatePayload).eq('id', product.id).select();
    let data = res.data;
    let error = res.error;

    if (error && (error.message.includes('attributes') || error.message.includes('color') || error.message.includes('unit') || error.message.includes('schema cache'))) {
      delete updatePayload.attributes;
      delete updatePayload.unit;
      delete updatePayload.color;
      let fallbackRes = await supabase.from('products').update(updatePayload).eq('id', product.id).select();
      data = fallbackRes.data;
      error = fallbackRes.error;
      if (!error) {
        toast.success(t('warehouse.productUpdated') || 'Товар обновлен', { icon: '⚠️' });
      }
    }

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

    if (!error && updatePayload.unit !== undefined) {
      toast.success(t('warehouse.productUpdated') || 'Товар обновлен');
    }

    setLoading(false);
    onProductUpdated();
    onClose();
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-5" onClick={onClose}>
        <div
          className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 flex flex-col border border-gray-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center px-6 py-4 sm:px-7 sm:py-5 border-b border-gray-100 bg-gray-50/70 shrink-0">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-merkez-blue/10 flex items-center justify-center text-merkez-blue shadow-xs">
                <Pencil className="w-6 h-6 text-merkez-blue" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 tracking-tight">{t('warehouse.editProduct')}</h3>
                <p className="text-xs text-gray-500 font-medium">
                  {i18n.language === 'az' ? 'Məhsulun parametrlərini və qiymətlərini yeniləyin' : 'Редактирование параметров, цен и характеристик товара'}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="w-10 h-10 rounded-xl bg-white hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors border border-gray-200 shadow-xs"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="p-6 sm:p-7 overflow-y-auto flex-1 custom-scrollbar">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Left Column (Core Info, Pricing, Stocks & Barcode) */}
                <div className="lg:col-span-7 space-y-4">
                  
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                      {t('warehouse.thName')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-5 py-3 bg-gray-50 border border-gray-100 hover:border-merkez-blue hover:bg-white transition-all rounded-xl text-sm font-semibold focus:outline-none focus:border-merkez-blue focus:bg-white shadow-xs"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  {/* Supplier & Category */}
                  <div className={`grid ${isAdmin ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                    {isAdmin && (
                      <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('warehouse.supplier')}</label>
                        <Dropdown
                          value={formData.supplier_id}
                          onChange={val => setFormData({ ...formData, supplier_id: val })}
                          searchable
                          searchPlaceholder={i18n.language === 'az' ? 'Tədarükçü axtar...' : i18n.language === 'ru' ? 'Поиск поставщика...' : 'Search supplier...'}
                          buttonClassName="rounded-xl px-4 py-3"
                          options={[
                            { value: '', label: t('warehouse.selectSupplier') || (i18n.language === 'az' ? 'Tədarükçü seçin' : i18n.language === 'ru' ? 'Выберите поставщика' : 'Select supplier') },
                            ...suppliers.map(s => ({ value: s.id, label: s.name }))
                          ]}
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('warehouse.thCategory')}</label>
                      <Dropdown
                        value={formData.category_id}
                        onChange={val => setFormData({ ...formData, category_id: val })}
                        buttonClassName="rounded-xl px-4 py-3"
                        searchable
                        searchPlaceholder={i18n.language === 'az' ? 'Kateqoriya axtar...' : i18n.language === 'ru' ? 'Поиск категории...' : 'Search category...'}
                        options={[
                          { value: '', label: t('warehouse.selectCategory') || (i18n.language === 'az' ? 'Kateqoriya seçin' : i18n.language === 'ru' ? 'Выберите категорию' : 'Select category') },
                          ...hierarchicalCategories.map(cat => ({
                            value: cat.id,
                            label: cat.label,
                            rawName: cat.rawName,
                            parentName: cat.parentName,
                            level: cat.level,
                            color: cat.color
                          }))
                        ]}
                      />
                    </div>
                  </div>

                  {/* Pricing (Factory, Purchase, Retail) */}
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                      {i18n.language === 'az' ? 'QİYMƏTLƏR' : 'ЦЕНЫ'}
                    </label>
                    <div className={`grid ${canSeeCostAndFactoryPrices ? 'grid-cols-3' : 'grid-cols-1'} gap-3`}>
                      {canSeeCostAndFactoryPrices && (
                        <>
                          <div>
                            <div className="flex items-center rounded-xl bg-gray-50 border border-gray-100 hover:border-merkez-blue focus-within:border-merkez-blue focus-within:bg-white transition-all shadow-xs overflow-hidden">
                              <Dropdown
                                value={factoryCurrency}
                                onChange={(val) => setFactoryCurrency(val)}
                                menuWidth={130}
                                trigger={
                                  <div className="flex items-center gap-1.5 px-3 py-3 bg-gray-100/80 hover:bg-gray-200/70 border-r border-gray-200 transition-colors select-none cursor-pointer">
                                    <span className="text-xs font-black text-gray-800">
                                      {getCurrencySymbol(factoryCurrency)} {factoryCurrency}
                                    </span>
                                    <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                                  </div>
                                }
                                options={CURRENCY_OPTIONS.map((c) => ({
                                  value: c.code,
                                  label: `${c.symbol} ${c.code}`
                                }))}
                              />
                              <input
                                type="text"
                                placeholder={t('warehouse.thFactoryPrice') || "Zavod"}
                                className="w-full px-2.5 py-3 bg-transparent text-sm focus:outline-none font-bold text-gray-900"
                                value={formData.factory_price}
                                onChange={(e) => setFormData({ ...formData, factory_price: e.target.value })}
                              />
                            </div>
                            <span className="text-[10px] text-gray-400 font-bold ml-1 mt-1 block uppercase">
                              {t('warehouse.thFactoryPrice') || 'Zavod'}
                            </span>
                          </div>

                          <div>
                            <div className="flex items-center rounded-xl bg-gray-50 border border-gray-100 hover:border-merkez-blue focus-within:border-merkez-blue focus-within:bg-white transition-all shadow-xs overflow-hidden">
                              <span className="flex items-center justify-center px-3 py-3 text-xs font-black text-gray-400 border-r border-gray-200/70 bg-gray-100/50 select-none">
                                ₼
                              </span>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                className="w-full px-2.5 py-3 bg-transparent text-sm focus:outline-none font-bold text-gray-900"
                                value={formData.purchase_price}
                                onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                              />
                            </div>
                            <span className="text-[10px] text-gray-400 font-bold ml-1 mt-1 block uppercase">
                              {t('warehouse.thPurchasePrice')}
                            </span>
                          </div>
                        </>
                      )}

                      <div>
                        <div className="flex items-center rounded-xl bg-gray-50 border border-gray-100 hover:border-merkez-blue focus-within:border-merkez-blue focus-within:bg-white transition-all shadow-xs overflow-hidden">
                          <span className="flex items-center justify-center px-3 py-3 text-xs font-black text-merkez-blue border-r border-gray-200/70 bg-gray-100/50 select-none">
                            ₼
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            required
                            placeholder="0.00"
                            className="w-full px-2.5 py-3 bg-transparent text-sm focus:outline-none font-bold text-merkez-blue"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                          />
                        </div>
                        <span className="text-[10px] text-merkez-blue font-bold ml-1 mt-1 block uppercase">
                          {t('warehouse.thPrice')} <span className="text-red-500">*</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stock, Critical & Unit */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('warehouse.thStock')}</label>
                      <input
                        type="number"
                        step="0.001"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 hover:border-merkez-blue hover:bg-white transition-all rounded-xl text-sm focus:outline-none focus:border-merkez-blue focus:bg-white shadow-xs font-bold"
                        value={formData.stock_quantity}
                        onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('warehouse.criticalStock')}</label>
                      <input
                        type="number"
                        step="0.001"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 hover:border-merkez-blue hover:bg-white transition-all rounded-xl text-sm focus:outline-none focus:border-merkez-blue focus:bg-white shadow-xs font-semibold"
                        value={formData.critical_stock}
                        onChange={(e) => setFormData({ ...formData, critical_stock: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('warehouse.thUnit') || 'Vahid'}</label>
                      <Dropdown
                        value={formData.unit}
                        onChange={val => setFormData({ ...formData, unit: val })}
                        buttonClassName="rounded-xl px-3 py-3"
                        options={availableUnits.map(u => ({ value: u, label: t('restaurant.' + u) || u }))}
                      />
                    </div>
                  </div>

                  {/* Barcode & Color/Size */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('warehouse.thBarcode')}</label>
                      <input
                        type="text"
                        className="w-full px-5 py-3 bg-gray-50 border border-gray-100 hover:border-merkez-blue hover:bg-white transition-all rounded-xl text-sm focus:outline-none focus:border-merkez-blue focus:bg-white font-mono shadow-xs font-semibold"
                        value={formData.barcode}
                        onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{i18n.language === 'az' ? 'Rəng / Ölçü' : 'Цвет / Размер'}</label>
                      <input
                        type="text"
                        list="color-suggestions"
                        placeholder="məs. 4/4, BLACK, 40 CM..."
                        value={formData.color}
                        onChange={e => setFormData({ ...formData, color: e.target.value })}
                        className="w-full px-5 py-3 bg-gray-50 border border-gray-100 hover:border-merkez-blue hover:bg-white transition-all rounded-xl text-sm focus:outline-none focus:border-merkez-blue focus:bg-white shadow-xs font-semibold"
                      />
                      <datalist id="color-suggestions">
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

                  {/* Additional notes */}
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                      {i18n.language === 'az' ? 'ƏLAVƏ MƏLUMAT' : 'ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ'}
                    </label>
                    <textarea
                      rows={2}
                      placeholder="məs. CƏLAL, Hədiyyə: MİZRAB, xüsusi qeydlər..."
                      className="w-full px-5 py-2.5 bg-gray-50 border border-gray-100 hover:border-merkez-blue hover:bg-white transition-all rounded-xl text-sm focus:outline-none focus:border-merkez-blue focus:bg-white shadow-xs resize-none"
                      value={formData.additional_info}
                      onChange={(e) => setFormData({ ...formData, additional_info: e.target.value })}
                    />
                  </div>

                </div>

                {/* Right Column (Characteristics & Photo) */}
                <div className="lg:col-span-5 space-y-4 flex flex-col">
                  {/* Characteristics Editor */}
                  <div className="flex-1">
                    <ProductCharacteristicsEditor
                      attributes={attributes}
                      onChange={setAttributes}
                    />
                  </div>

                  {/* Photo Box */}
                  <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-merkez-blue" />
                        {i18n.language === 'az' ? 'Məhsul Şəkli' : 'Фотография товара'}
                      </span>
                      {imagePreview && (
                        <button
                          type="button"
                          onClick={() => {
                            setImageFile(null);
                            setImagePreview(null);
                            setDeleteImage(true);
                          }}
                          className="text-[11px] font-bold text-red-500 hover:text-red-700 transition-colors"
                        >
                          {i18n.language === 'az' ? 'Şəkli sil' : 'Удалить'}
                        </button>
                      )}
                    </div>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-200 hover:border-merkez-blue bg-white rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition-all min-h-[95px]"
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageChange}
                        accept="image/*"
                        className="hidden"
                      />
                      {imagePreview ? (
                        <img src={imagePreview} alt="Preview" className="h-20 object-contain rounded-lg shadow-xs" />
                      ) : (
                        <div className="flex items-center gap-2 text-gray-400 hover:text-gray-600">
                          <Upload className="w-4 h-4 text-gray-400" />
                          <span className="text-xs font-medium">
                            {i18n.language === 'az' ? 'Şəkil yüklə (istəyə görə)' : 'Загрузить фото (необязательно)'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="px-6 py-4 sm:px-7 bg-gray-50/90 border-t border-gray-100 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-200/60 transition-colors"
              >
                {i18n.language === 'az' ? 'İmtina' : 'Отмена'}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-gradient-primary px-7 py-3 rounded-xl text-sm font-bold flex items-center justify-center disabled:opacity-50 shadow-md shadow-merkez-blue/20"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <Save className="w-5 h-5 mr-2" />
                )}
                {t('common.saveChanges')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};

export default EditProductModal;
