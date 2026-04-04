import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, FilePlus, Edit2, Trash2, X } from 'lucide-react';
import { supabase } from '../../../supabaseClient';

const MenuManager = () => {
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [isAddDishModalOpen, setIsAddDishModalOpen] = useState(false);
  
  // Data states
  const [menu, setMenu] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Dish Form State
  const [newDish, setNewDish] = useState({ name: '', price: '', category_id: '', status: 'Available' });

  // Filtering states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const statuses = ['All', 'Available', 'Out of Stock'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: catData } = await supabase.from('categories').select('*');
    const { data: prodData } = await supabase
      .from('products')
      .select('*, categories(name)');
    
    if (catData) {
      setCategories(catData);
      if (catData.length > 0 && !newDish.category_id) {
        setNewDish(prev => ({ ...prev, category_id: catData[0].id }));
      }
    }
    
    if (prodData) {
      setMenu(prodData.map(p => ({
        ...p,
        category: p.categories?.name || 'Uncategorized',
        status: 'Available'
      })));
    }
    setLoading(false);
  };

  const handleAddDish = async () => {
    if (!newDish.name || !newDish.price) return;
    
    const { error } = await supabase
      .from('products')
      .insert([{
        name: newDish.name,
        price: parseFloat(newDish.price),
        category_id: newDish.category_id,
        description: 'Added via UI'
      }]);
    
    if (!error) {
      setIsAddDishModalOpen(false);
      setNewDish({ name: '', price: '', category_id: categories[0]?.id, status: 'Available' });
      fetchData();
    }
  };

  const handleDeleteDish = async (id) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (!error) {
      fetchData();
    }
  };

  // Apply filters
  const filteredMenu = menu.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col h-full overflow-hidden">
      
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="w-4 h-4 text-gray-400" />
          </div>
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-gray-50 border border-gray-100 text-gray-900 text-sm rounded-lg focus:ring-merkez-blue focus:border-merkez-blue block w-full pl-10 p-2.5 transition-colors outline-none" 
            placeholder="Search dishes..."
          />
        </div>
        
        <div className="flex items-center gap-2">
          <select 
             value={categoryFilter}
             onChange={(e) => setCategoryFilter(e.target.value)}
             className="px-4 py-2 bg-gray-50 border border-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-100 flex items-center transition-colors outline-none cursor-pointer appearance-none"
             style={{ backgroundImage: 'none' }}
          >
             <option value="All">All Categories</option>
             {categories.map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
             ))}
          </select>
          
          <select 
             value={statusFilter}
             onChange={(e) => setStatusFilter(e.target.value)}
             className="px-4 py-2 bg-gray-50 border border-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-100 flex items-center transition-colors outline-none cursor-pointer appearance-none"
             style={{ backgroundImage: 'none' }}
          >
             {statuses.map(stat => (
                <option key={stat} value={stat}>{stat === 'All' ? 'All Statuses' : stat}</option>
             ))}
          </select>
        </div>

        <button 
           onClick={() => setIsAddCategoryModalOpen(true)}
           className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center transition-colors shadow-sm"
        >
          <FilePlus className="w-4 h-4 mr-2" /> Add Category
        </button>
        <button 
           onClick={() => setIsAddDishModalOpen(true)}
           className="px-4 py-2 bg-merkez-green text-white rounded-lg text-sm font-medium hover:bg-green-600 flex items-center transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Dish
        </button>
      </div>

      <div className="overflow-auto flex-1 border border-gray-100 rounded-xl relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-merkez-blue border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-[11px] uppercase text-gray-500 tracking-wider">
              <th className="font-semibold p-4">Dish Name</th>
              <th className="font-semibold p-4">Category</th>
              <th className="font-semibold p-4">Price</th>
              <th className="font-semibold p-4">Status</th>
              <th className="font-semibold p-4 text-right rounded-tr-xl">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredMenu.length > 0 ? (
              filteredMenu.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 font-medium text-gray-900 flex items-center">
                     <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center mr-3 text-gray-500">
                        🥘
                     </div>
                     {item.name}
                  </td>
                  <td className="p-4 text-sm text-gray-500">{item.category}</td>
                  <td className="p-4 text-sm font-bold text-gray-900">${item.price.toFixed(2)}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                      item.status === 'Available' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-gray-400 hover:text-merkez-blue p-1.5 transition-colors mr-1">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteDish(item.id)}
                      className="text-gray-400 hover:text-red-500 p-1.5 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
               <tr>
                 <td colSpan="5" className="p-8 text-center text-gray-400 text-sm">
                   {loading ? 'Loading...' : 'No dishes found matching your criteria.'}
                 </td>
               </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODALS */}

      {/* Add Category Modal */}
      {isAddCategoryModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50">
              <h3 className="text-xl font-bold text-gray-900">Add Category</h3>
              <button onClick={() => setIsAddCategoryModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-200 transition-colors">
                <X className="w-5 h-5"/>
              </button>
            </div>
            <div className="p-5 space-y-4">
               <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Category Name</label>
                  <input type="text" placeholder="e.g. Starters or Soups" className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-merkez-blue focus:border-merkez-blue block p-2.5 outline-none transition-colors" />
               </div>
               <button onClick={() => setIsAddCategoryModalOpen(false)} className="w-full bg-merkez-blue text-white py-2.5 rounded-lg text-sm font-bold shadow-sm hover:bg-blue-600 transition-colors mt-2">
                 Create Category
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Dish Modal */}
      {isAddDishModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50">
              <h3 className="text-xl font-bold text-gray-900">Add New Dish</h3>
              <button onClick={() => setIsAddDishModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-200 transition-colors">
                <X className="w-5 h-5"/>
              </button>
            </div>
            <div className="p-5 space-y-4">
               <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Dish Name</label>
                  <input 
                    type="text" 
                    value={newDish.name}
                    onChange={(e) => setNewDish(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Garlic Bread" 
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-merkez-green focus:border-merkez-green block p-2.5 outline-none transition-colors" 
                  />
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Category</label>
                    <select 
                      value={newDish.category_id}
                      onChange={(e) => setNewDish(prev => ({ ...prev, category_id: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-merkez-green focus:border-merkez-green block p-2.5 outline-none transition-colors cursor-pointer"
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Price ($)</label>
                    <input 
                      type="number" 
                      value={newDish.price}
                      onChange={(e) => setNewDish(prev => ({ ...prev, price: e.target.value }))}
                      placeholder="0.00" 
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-merkez-green focus:border-merkez-green block p-2.5 outline-none transition-colors" 
                    />
                 </div>
               </div>
               <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Status</label>
                  <select 
                    value={newDish.status}
                    onChange={(e) => setNewDish(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-merkez-green focus:border-merkez-green block p-2.5 outline-none transition-colors cursor-pointer"
                  >
                    <option>Available</option>
                    <option>Out of Stock</option>
                  </select>
               </div>
               <button 
                onClick={handleAddDish}
                className="w-full bg-merkez-green text-white py-2.5 rounded-lg text-sm font-bold shadow-sm hover:bg-green-600 transition-colors mt-2"
              >
                 Save Dish
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuManager;
