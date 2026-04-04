import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Plus, Filter, AlertTriangle, CheckCircle2, FolderTree, MoreVertical, Loader2, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import AddProductModal from './AddProductModal';
import AddCategoryModal from './AddCategoryModal';
import EditProductModal from './EditProductModal';

const WarehouseModule = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    fetchAll();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchCategories(), fetchProducts()]);
    setLoading(false);
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('name', { ascending: true });
    if (data) setCategories(data);
  };

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*, categories(name)').order('name', { ascending: true });
    if (data) setProducts(data);
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    setOpenMenuId(null);
    const { error } = await supabase.from('products').delete().eq('id', productId);
    if (!error) setProducts(prev => prev.filter(p => p.id !== productId));
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setOpenMenuId(null);
  };

  const getStatusIcon = (stock) => {
    if (stock === 0) return <AlertTriangle className="w-4 h-4 text-merkez-red" />;
    if (stock < 15) return <AlertTriangle className="w-4 h-4 text-merkez-yellow" />;
    return <CheckCircle2 className="w-4 h-4 text-merkez-green" />;
  };

  const getStatusText = (stock) => {
    if (stock === 0) return 'Out of Stock';
    if (stock < 15) return 'Low Stock';
    return 'In Stock';
  };

  const getStatusColor = (stock) => {
    if (stock === 0) return 'text-merkez-red';
    if (stock < 15) return 'text-merkez-yellow';
    return 'text-merkez-green';
  };

  const filteredProducts = products
    .filter(p => selectedCategory ? p.categories?.name === selectedCategory : true)
    .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 flex flex-col h-full">
      {/* Modals */}
      <AddProductModal isOpen={showAddProduct} onClose={() => setShowAddProduct(false)} categories={categories} onProductAdded={fetchProducts} />
      <AddCategoryModal isOpen={showAddCategory} onClose={() => setShowAddCategory(false)} onCategoryAdded={fetchCategories} />
      <EditProductModal isOpen={!!editingProduct} product={editingProduct} onClose={() => setEditingProduct(null)} categories={categories} onProductUpdated={fetchProducts} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('sidebar.warehouse')}</h1>
          <p className="text-sm text-gray-500 mt-1">Full control over inventory, categories, and subcategories.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowAddCategory(true)} className="bg-white border text-gray-600 border-gray-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center shadow-sm">
            <FolderTree className="w-4 h-4 mr-2" /> Manage Categories
          </button>
          <button onClick={() => setShowAddProduct(true)} className="bg-merkez-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors flex items-center shadow-sm">
            <Plus className="w-4 h-4 mr-2" /> Add Product
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* Categories Sidebar */}
        <div className="w-64 bg-white rounded-xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-gray-50 p-4 flex flex-col">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Categories</h3>
          <div className="space-y-1 overflow-y-auto flex-1">
            <div className={`p-2 rounded-lg cursor-pointer text-sm font-medium transition-colors ${selectedCategory === null ? 'bg-blue-50 text-merkez-blue' : 'text-gray-700 hover:bg-gray-50'}`} onClick={() => setSelectedCategory(null)}>
              All Categories
            </div>
            {categories.map(cat => (
              <div key={cat.id} className={`p-2 rounded-lg cursor-pointer text-sm flex items-center justify-between font-medium transition-colors ${selectedCategory === cat.name ? 'bg-blue-50 text-merkez-blue' : 'text-gray-700 hover:bg-gray-50'}`} onClick={() => setSelectedCategory(selectedCategory === cat.name ? null : cat.name)}>
                <div className="flex items-center">
                  <FolderTree className="w-4 h-4 mr-2 text-gray-400" />
                  {cat.name}
                </div>
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                  {products.filter(p => p.categories?.name === cat.name).length}
                </span>
              </div>
            ))}
          </div>
          <button onClick={() => setShowAddCategory(true)} className="mt-4 w-full py-2 border-2 border-dashed border-gray-200 text-gray-400 rounded-lg text-sm font-medium hover:text-merkez-blue hover:border-merkez-blue transition-colors flex items-center justify-center">
            <Plus className="w-4 h-4 mr-1.5" /> Add Category
          </button>
        </div>

        {/* Products Table Area */}
        <div className="flex-1 flex flex-col bg-white rounded-xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-gray-50 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="text" placeholder="Search products by name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-none focus:border-merkez-blue focus:ring-1 focus:ring-merkez-blue transition-colors" />
            </div>
            <button className="bg-gray-50 border border-gray-100 p-2 rounded-lg text-gray-500 hover:text-gray-700 transition-colors">
              <Filter className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-auto" ref={menuRef}>
            {loading ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin mr-3" /><span>Loading inventory...</span>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                <FolderTree className="w-12 h-12 text-gray-200" />
                <p className="font-medium">No products found</p>
                <button onClick={() => setShowAddProduct(true)} className="px-4 py-2 bg-merkez-blue text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors shadow-sm">
                  <Plus className="w-4 h-4 inline mr-1" /> Add First Product
                </button>
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead className="sticky top-0 bg-gray-50/90 backdrop-blur-sm z-10">
                  <tr className="border-b border-gray-100 text-xs uppercase text-gray-500 tracking-wider">
                    <th className="font-medium p-4">Product Name</th>
                    <th className="font-medium p-4">Category</th>
                    <th className="font-medium p-4">Price</th>
                    <th className="font-medium p-4">Status</th>
                    <th className="font-medium p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredProducts.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4">
                        <p className="font-medium text-gray-900">{item.name}</p>
                      </td>
                      <td className="p-4">
                        <span className="text-sm bg-blue-50 text-merkez-blue px-2.5 py-1 rounded-full font-medium">
                          {item.categories?.name || '—'}
                        </span>
                      </td>
                      <td className="p-4 text-sm font-bold text-gray-900">${parseFloat(item.price).toFixed(2)}</td>
                      <td className="p-4">
                        <div className={`flex items-center text-sm font-medium ${getStatusColor(item.stock ?? 999)}`}>
                          {getStatusIcon(item.stock ?? 999)}
                          <span className="ml-2">{getStatusText(item.stock ?? 999)}</span>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="relative inline-block">
                          <button
                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === item.id ? null : item.id); }}
                            className="text-gray-400 hover:text-merkez-blue transition-colors p-1.5 rounded-md hover:bg-blue-50"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>

                          {openMenuId === item.id && (
                            <div className="absolute right-0 top-9 z-30 bg-white border border-gray-100 rounded-xl shadow-xl w-44 py-1.5 animate-in fade-in zoom-in-95">
                              <button
                                onClick={() => handleEdit(item)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                              >
                                <Pencil className="w-4 h-4 text-merkez-blue" />
                                Edit Product
                              </button>
                              <div className="mx-3 my-1 border-t border-gray-100" />
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors font-medium"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete Product
                              </button>
                            </div>
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
    </div>
  );
};

export default WarehouseModule;
