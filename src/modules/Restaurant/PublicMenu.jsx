import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { Utensils, Info, MapPin, Phone, Globe, ChevronRight } from 'lucide-react';

const PublicMenu = () => {
  const { businessId } = useParams();
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    fetchMenuData();
  }, [businessId]);

  const fetchMenuData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Business Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .or(`id.eq.${businessId},tenant_id.eq.${businessId}`)
        .single();

      if (profileData) {
        setBusiness(profileData);
        const userId = profileData.id;

        // 2. Fetch Categories
        const { data: catData } = await supabase
          .from('categories')
          .select('*')
          .eq('user_id', userId)
          .order('name');
        
        if (catData) setCategories(catData);

        // 3. Fetch Products
        const { data: prodData } = await supabase
          .from('products')
          .select('*, categories(name)')
          .eq('user_id', userId)
          .eq('archived', false);
        
        if (prodData) setProducts(prodData);
      }
    } catch (err) {
      console.error('Error fetching menu:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-medium animate-pulse">Menyu yüklənir...</p>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl max-w-sm border border-gray-100">
           <Utensils className="w-16 h-16 text-gray-200 mx-auto mb-6" />
           <h1 className="text-2xl font-black text-gray-900 mb-2">Menyu tapılmadı</h1>
           <p className="text-gray-500 mb-8">Bu link üzrə menyu mövcud deyil və ya silinib.</p>
           <button 
             onClick={() => window.location.href = '/'}
             className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold hover:bg-black transition-all"
           >
             Ana səhifəyə qayıt
           </button>
        </div>
      </div>
    );
  }

  const filteredProducts = activeCategory === 'All' 
    ? products 
    : products.filter(p => p.categories?.name === activeCategory);

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      {/* Hero Header */}
      <div className="relative h-64 bg-gray-900 overflow-hidden">
        {business.avatar_url ? (
          <img 
            src={business.avatar_url} 
            alt={business.business_name} 
            className="w-full h-full object-cover opacity-60 scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-900 opacity-80" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent" />
        
        <div className="absolute bottom-0 left-0 right-0 p-6 pb-12 text-white">
          <h1 className="text-4xl font-black tracking-tight mb-2 drop-shadow-lg">{business.business_name || 'Restoran'}</h1>
          <div className="flex flex-wrap gap-4 text-sm font-medium opacity-90">
             {business.address && (
               <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                 <MapPin className="w-3.5 h-3.5" />
                 {business.address}
               </div>
             )}
             {business.phone && (
               <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                 <Phone className="w-3.5 h-3.5" />
                 {business.phone}
               </div>
             )}
          </div>
        </div>
      </div>

      {/* Floating Info Overlay */}
      <div className="px-4 -mt-8 relative z-10">
        <div className="bg-white rounded-[2rem] shadow-2xl shadow-blue-900/5 p-2 flex space-x-1 overflow-x-auto no-scrollbar border border-gray-100">
           <button
             onClick={() => setActiveCategory('All')}
             className={`px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
               activeCategory === 'All' 
               ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
               : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'
             }`}
           >
             Hamısı
           </button>
           {categories.map(cat => (
             <button
               key={cat.id}
               onClick={() => setActiveCategory(cat.name)}
               className={`px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                 activeCategory === cat.name 
                 ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                 : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'
               }`}
             >
               {cat.name}
             </button>
           ))}
        </div>
      </div>

      {/* Menu Grid */}
      <div className="max-w-3xl mx-auto px-4 mt-10 space-y-8">
        {categories.filter(c => activeCategory === 'All' || c.name === activeCategory).map(cat => {
          const catProducts = products.filter(p => p.categories?.name === cat.name);
          if (catProducts.length === 0) return null;

          return (
            <div key={cat.id} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
               <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] ml-2 flex items-center gap-4">
                 {cat.name}
                 <span className="flex-1 h-px bg-blue-100/50"></span>
               </h3>
               
               <div className="grid gap-4">
                 {catProducts.map(product => (
                   <div key={product.id} className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 group active:scale-[0.98] transition-transform">
                      <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden border border-gray-50 group-hover:border-blue-100 transition-colors">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <Utensils className="w-8 h-8 text-gray-200" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0 py-1">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="text-[15px] font-bold text-gray-900 truncate pr-2 tracking-tight group-hover:text-blue-600 transition-colors">{product.name}</h4>
                          <span className="text-[15px] font-black text-gray-900 tabular-nums">${parseFloat(product.price).toFixed(2)}</span>
                        </div>
                        <p className="text-xs text-gray-400 font-medium line-clamp-2 leading-relaxed">
                          {product.description || 'Xüsusi dad və təravətlə hazırlanmış ləzzətli seçim.'}
                        </p>
                      </div>
                   </div>
                 ))}
               </div>
            </div>
          );
        })}

        {filteredProducts.length === 0 && (
          <div className="py-20 text-center">
             <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-gray-100 border border-gray-50">
               <Utensils className="w-8 h-8 text-gray-100" />
             </div>
             <h3 className="text-lg font-bold text-gray-900 mb-1">Hələlik boşdur</h3>
             <p className="text-gray-400 text-sm">Bu kateqoriyada yemək tapılmadı.</p>
          </div>
        )}
      </div>

      {/* Powered By */}
      <div className="text-center mt-12 opacity-30 group hover:opacity-100 transition-opacity">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">Powered by</p>
        <h2 className="text-sm font-black text-gray-900 tracking-tighter">MERKEZ CRM</h2>
      </div>

      {/* Sticky Bottom Badge */}
      <div className="fixed bottom-6 left-0 right-0 px-6 flex justify-center pointer-events-none">
        <div className="bg-gray-900/90 backdrop-blur-xl text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-white/10 pointer-events-auto">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
          <span className="text-xs font-black uppercase tracking-widest">Sifariş üçün ofisiantı çağırın</span>
        </div>
      </div>
    </div>
  );
};

export default PublicMenu;
