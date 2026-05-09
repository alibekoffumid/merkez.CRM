import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { Utensils, Info, MapPin, Phone, Globe, ChevronRight, Star, Heart, Clock } from 'lucide-react';

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
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', businessId)
        .single();

      if (profileData) {
        setBusiness(profileData);
        const userId = profileData.id;

        const { data: catData } = await supabase
          .from('categories')
          .select('*')
          .eq('user_id', userId)
          .order('name');
        
        if (catData) setCategories(catData);

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
      <div className="min-h-screen bg-[#0a0a0b] flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full animate-pulse" />
        <div className="relative">
          <div className="w-20 h-20 border-[3px] border-white/5 border-t-blue-500 rounded-full animate-spin"></div>
          <Utensils className="w-8 h-8 text-blue-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-bounce" />
        </div>
        <p className="text-white/40 font-bold tracking-[0.3em] uppercase text-[10px] mt-8 animate-pulse">Merkez Menu</p>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white/5 backdrop-blur-3xl p-12 rounded-[3.5rem] shadow-2xl max-w-sm border border-white/10">
           <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-pink-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-red-500/20">
              <Info className="w-10 h-10 text-white" />
           </div>
           <h1 className="text-3xl font-black text-white mb-3">Menyu tapılmadı</h1>
           <p className="text-white/50 mb-10 leading-relaxed">Bu link üzrə menyu mövcud deyil və ya silinib.</p>
           <button 
             onClick={() => window.location.href = '/'}
             className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-95"
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
    <div className="min-h-screen bg-[#0f1115] text-white selection:bg-blue-500/30">
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
         <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full" />
         <div className="absolute bottom-[-5%] left-[-5%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
      </div>

      {/* Modern Hero Section */}
      <div className="relative h-[45vh] sm:h-[50vh] overflow-hidden">
        {business.avatar_url ? (
          <img 
            src={business.avatar_url} 
            alt={business.business_name} 
            className="w-full h-full object-cover scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-900 via-indigo-900 to-black" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f1115] via-[#0f1115]/40 to-transparent" />
        
        <div className="absolute inset-0 flex flex-col justify-end p-6 pb-12 sm:p-12">
          <div className="max-w-4xl mx-auto w-full">
            <span className="inline-block px-4 py-1.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full mb-4 shadow-lg shadow-blue-600/40 animate-in slide-in-from-left duration-700">
               Açıqdır • Digital Menu
            </span>
            <h1 className="text-5xl sm:text-7xl font-black tracking-tighter mb-4 animate-in slide-in-from-bottom duration-700">{business.business_name || 'Restoran'}</h1>
            <div className="flex flex-wrap gap-3 text-sm font-bold">
               {business.address && (
                 <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
                   <MapPin className="w-4 h-4 text-blue-500" />
                   <span className="text-white/70">{business.address}</span>
                 </div>
               )}
               {business.phone && (
                 <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
                   <Phone className="w-4 h-4 text-blue-500" />
                   <span className="text-white/70">{business.phone}</span>
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>

      {/* Premium Category Navigation */}
      <div className="sticky top-0 z-40 bg-[#0f1115]/80 backdrop-blur-2xl border-b border-white/5 py-4">
        <div className="max-w-4xl mx-auto px-6 overflow-x-auto no-scrollbar flex items-center gap-2">
           <button
             onClick={() => setActiveCategory('All')}
             className={`px-8 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-[0.15em] transition-all whitespace-nowrap flex items-center gap-2 ${
               activeCategory === 'All' 
               ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30 scale-105' 
               : 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10'
             }`}
           >
             <Star className={`w-3.5 h-3.5 ${activeCategory === 'All' ? 'fill-current' : ''}`} />
             Hamısı
           </button>
           {categories.map(cat => (
             <button
               key={cat.id}
               onClick={() => setActiveCategory(cat.name)}
               className={`px-8 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-[0.15em] transition-all whitespace-nowrap ${
                 activeCategory === cat.name 
                 ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30 scale-105' 
                 : 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10'
               }`}
             >
               {cat.name}
             </button>
           ))}
        </div>
      </div>

      {/* Menu Grid - Premium Cards */}
      <div className="max-w-4xl mx-auto px-6 pt-12 pb-32 space-y-16">
        {categories.filter(c => activeCategory === 'All' || c.name === activeCategory).map(cat => {
          const catProducts = products.filter(p => p.categories?.name === cat.name);
          if (catProducts.length === 0) return null;

          return (
            <div key={cat.id} className="space-y-8">
               <div className="flex items-center gap-6">
                  <h3 className="text-lg font-black text-white uppercase tracking-[0.25em]">
                    {cat.name}
                  </h3>
                  <div className="flex-1 h-[2px] bg-gradient-to-r from-blue-600/50 to-transparent"></div>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {catProducts.map(product => (
                    <div key={product.id} className="group relative bg-[#16191f] rounded-[2.5rem] p-5 border border-white/[0.03] hover:border-blue-500/30 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/10 active:scale-[0.98] overflow-hidden">
                       {/* Subtle Background Glow on Hover */}
                       <div className="absolute inset-0 bg-gradient-to-br from-blue-600/0 via-transparent to-transparent group-hover:from-blue-600/[0.03] transition-colors duration-700"></div>
                       
                       <div className="flex gap-5 relative z-10">
                          <div className="w-24 h-24 sm:w-28 sm:h-28 bg-[#1c2128] rounded-[1.8rem] flex items-center justify-center shrink-0 overflow-hidden border border-white/5 group-hover:border-blue-500/20 transition-all duration-500">
                            {product.image_url ? (
                              <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                            ) : (
                              <Utensils className="w-10 h-10 text-white/5 group-hover:text-blue-500/20 transition-colors duration-500" />
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                            <div>
                               <div className="flex justify-between items-start mb-2">
                                 <h4 className="text-[17px] font-black text-white/90 truncate pr-2 group-hover:text-white transition-colors tracking-tight">{product.name}</h4>
                                 <div className="bg-blue-600/10 px-3 py-1 rounded-xl border border-blue-500/20">
                                   <span className="text-[15px] font-black text-blue-500 tabular-nums">${parseFloat(product.price).toFixed(2)}</span>
                                 </div>
                               </div>
                               <p className="text-[13px] text-white/30 font-medium line-clamp-2 leading-relaxed mb-4 group-hover:text-white/40 transition-colors">
                                 {product.description || 'Sizin üçün xüsusi seçilmiş təzə və ləzzətli inqrediyentlərlə hazırlanmış möhtəşəm seçim.'}
                               </p>
                            </div>
                            
                            <div className="flex items-center gap-4 text-[10px] font-black text-white/10 uppercase tracking-widest group-hover:text-blue-500/40 transition-colors">
                               <div className="flex items-center gap-1.5">
                                 <Clock className="w-3 h-3" />
                                 15-20 Min
                               </div>
                               <div className="flex items-center gap-1.5">
                                 <Heart className="w-3 h-3" />
                                 Popular
                               </div>
                            </div>
                          </div>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          );
        })}

        {filteredProducts.length === 0 && (
          <div className="py-32 text-center">
             <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border border-white/10 animate-pulse">
               <Utensils className="w-10 h-10 text-white/10" />
             </div>
             <h3 className="text-xl font-black text-white/80 mb-2">Hələlik boşdur</h3>
             <p className="text-white/30 text-sm max-w-xs mx-auto leading-relaxed">Bu kateqoriyada yemək tapılmadı. Zəhmət olmasa digər bölmələrə baxın.</p>
          </div>
        )}
      </div>

      {/* Powered By Premium Footer */}
      <div className="text-center pb-20 opacity-20 hover:opacity-100 transition-all duration-700">
        <div className="w-8 h-[1px] bg-white/20 mx-auto mb-8"></div>
        <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.4em] mb-2">Designed by</p>
        <div className="flex items-center justify-center gap-3">
           <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
           <h2 className="text-lg font-black text-white tracking-tighter uppercase">MERKEZ CRM</h2>
        </div>
      </div>

      {/* Glassmorphic Sticky Action Button */}
      <div className="fixed bottom-8 left-0 right-0 px-8 flex justify-center z-[50]">
        <button className="group relative bg-white/[0.03] hover:bg-blue-600 backdrop-blur-3xl px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-white/10 hover:border-blue-500 transition-all duration-500 active:scale-95 pointer-events-auto overflow-hidden">
           {/* Animated Gradient Shine */}
           <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
           
           <div className="relative w-3 h-3 flex items-center justify-center">
              <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-40"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full group-hover:bg-white transition-colors shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
           </div>
           <span className="relative text-xs font-black uppercase tracking-[0.2em] text-white">Sifariş üçün ofisiantı çağırın</span>
           <ChevronRight className="relative w-4 h-4 text-white/40 group-hover:text-white group-hover:translate-x-1 transition-all" />
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slide-in-bottom {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-in {
          animation: slide-in-bottom 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
};

export default PublicMenu;
