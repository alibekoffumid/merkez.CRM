import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Plus, Filter, PackageOpen, AlertTriangle, CheckCircle2, FolderTree, ArrowRight, MoreVertical } from 'lucide-react';

const mockCategories = [
  { id: 1, name: 'Electronics', count: 120, subcategories: ['Laptops', 'Keyboards', 'Mice'] },
  { id: 2, name: 'Furniture', count: 45, subcategories: ['Chairs', 'Desks', 'Cabinets'] },
  { id: 3, name: 'Accessories', count: 350, subcategories: ['Cables', 'Adapters', 'Hubs'] },
];

const mockInventory = [
  { id: 'ITM-001', name: 'Wireless Ergonomic Mouse', category: 'Electronics', subcategory: 'Mice', stock: 145, status: 'In Stock', price: '$45.00' },
  { id: 'ITM-002', name: 'Mechanical Keyboard (Red Switches)', category: 'Electronics', subcategory: 'Keyboards', stock: 12, status: 'Low Stock', price: '$89.99' },
  { id: 'ITM-003', name: 'Office Chair (Mesh)', category: 'Furniture', subcategory: 'Chairs', stock: 0, status: 'Out of Stock', price: '$199.99' },
  { id: 'ITM-004', name: 'USB-C Hub (7-in-1)', category: 'Accessories', subcategory: 'Hubs', stock: 350, status: 'In Stock', price: '$29.50' },
  { id: 'ITM-005', name: 'Monitor Arm Mount', category: 'Accessories', subcategory: 'Adapters', stock: 5, status: 'Low Stock', price: '$65.00' },
];

const WarehouseModule = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);

  const getStatusIcon = (status) => {
    switch(status) {
      case 'In Stock': return <CheckCircle2 className="w-4 h-4 text-merkez-green" />;
      case 'Low Stock': return <AlertTriangle className="w-4 h-4 text-merkez-yellow" />;
      case 'Out of Stock': return <AlertTriangle className="w-4 h-4 text-merkez-red" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('sidebar.warehouse')}</h1>
          <p className="text-sm text-gray-500 mt-1">Full control over inventory, categories, and subcategories.</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white border text-gray-600 border-gray-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center shadow-sm">
            <FolderTree className="w-4 h-4 mr-2" />
            Manage Categories
          </button>
          <button className="bg-merkez-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors flex items-center shadow-sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* Categories Sidebar */}
        <div className="w-64 bg-white rounded-xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-gray-50 p-4 flex flex-col">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Categories</h3>
          <div className="space-y-2 overflow-y-auto">
            <div 
              className={`p-2 rounded-lg cursor-pointer text-sm font-medium transition-colors ${selectedCategory === null ? 'bg-blue-50 text-merkez-blue' : 'text-gray-700 hover:bg-gray-50'}`}
              onClick={() => setSelectedCategory(null)}
            >
              All Categories
            </div>
            {mockCategories.map(cat => (
              <div key={cat.id} className="space-y-1">
                <div 
                  className={`p-2 rounded-lg cursor-pointer text-sm flex items-center justify-between font-medium transition-colors ${selectedCategory === cat.name ? 'bg-blue-50 text-merkez-blue' : 'text-gray-700 hover:bg-gray-50'}`}
                  onClick={() => setSelectedCategory(cat.name)}
                >
                  <div className="flex items-center">
                    <FolderTree className="w-4 h-4 mr-2 text-gray-400" />
                    {cat.name}
                  </div>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{cat.count}</span>
                </div>
                {/* Subcategories */}
                {selectedCategory === cat.name && (
                   <div className="pl-6 space-y-1 mt-1">
                     {cat.subcategories.map(sub => (
                       <div key={sub} className="p-1.5 text-xs text-gray-500 hover:text-merkez-blue cursor-pointer flex items-center">
                         <ArrowRight className="w-3 h-3 mr-1" /> {sub}
                       </div>
                     ))}
                   </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Products Table Area */}
        <div className="flex-1 flex flex-col bg-white rounded-xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-gray-50 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex gap-4">
             <div className="relative flex-1 max-w-md">
               <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
               <input 
                 type="text" 
                 placeholder="Search products by Name or SKU..." 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-none focus:border-merkez-blue focus:ring-1 focus:ring-merkez-blue transition-colors"
               />
             </div>
             <button className="bg-gray-50 border border-gray-100 p-2 rounded-lg text-gray-500 hover:text-gray-700 transition-colors">
               <Filter className="w-5 h-5" />
             </button>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="sticky top-0 bg-gray-50/90 backdrop-blur-sm z-10">
                <tr className="border-b border-gray-100 text-xs uppercase text-gray-500 tracking-wider">
                  <th className="font-medium p-4">SKU/ID</th>
                  <th className="font-medium p-4">Product Info</th>
                  <th className="font-medium p-4">Category</th>
                  <th className="font-medium p-4">Price</th>
                  <th className="font-medium p-4">Stock</th>
                  <th className="font-medium p-4">Status</th>
                  <th className="font-medium p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {mockInventory
                  .filter(item => selectedCategory ? item.category === selectedCategory : true)
                  .map(item => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 text-sm font-medium text-gray-500">{item.id}</td>
                    <td className="p-4">
                      <p className="font-medium text-gray-900">{item.name}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-gray-900">{item.category}</p>
                      <p className="text-xs text-gray-500">{item.subcategory}</p>
                    </td>
                    <td className="p-4 text-sm font-medium text-gray-900">{item.price}</td>
                    <td className="p-4 text-sm font-bold text-gray-700">{item.stock}</td>
                    <td className="p-4">
                      <div className="flex items-center text-sm font-medium text-gray-700">
                        {getStatusIcon(item.status)}
                        <span className="ml-2">{item.status}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <button className="text-gray-400 hover:text-merkez-blue transition-colors p-1 rounded-md hover:bg-blue-50">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarehouseModule;
