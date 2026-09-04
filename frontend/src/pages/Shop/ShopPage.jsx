import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, LayoutGrid, List, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import api from '../../services/api';
import { stagger } from '../../utils/animations';

const COLORS = [
  { name: 'قرمز', hex: '#dc2626' }, { name: 'آبی', hex: '#2563eb' }, { name: 'سبز', hex: '#16a34a' },
  { name: 'زرد', hex: '#eab308' }, { name: 'نارنجی', hex: '#f97316' }, { name: 'بنفش', hex: '#9333ea' },
  { name: 'صورتی', hex: '#ec4899' }, { name: 'سرخابی', hex: '#db2777' }, { name: 'مشکی', hex: '#1f2937' },
  { name: 'سفید', hex: '#f9fafb' }, { name: 'کرم', hex: '#fef3c7' }, { name: 'قهوه‌ای', hex: '#92400e' },
  { name: 'خاکستری', hex: '#6b7280' }, { name: 'نیلی', hex: '#312e81' }, { name: 'فیروزه‌ای', hex: '#0891b2' },
];

export default function ShopPage() {
  const { slug } = useParams();
  const [shop, setShop] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [conditionFilter, setConditionFilter] = useState('');
  const [showSort, setShowSort] = useState(true);
  const [showCondition, setShowCondition] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  useEffect(() => {
    const fetchShop = async () => {
      try {
        const numericId = Number(slug);
        if (numericId && !isNaN(numericId)) {
          try {
            const shopRes = await api.get(`/shops/${numericId}/`);
            if (shopRes.data) {
              setShop(shopRes.data);
              const productsRes = await api.get(`/shops/${numericId}/products/list/`);
              setAllProducts(productsRes.data || []);
              return;
            }
          } catch (e) { console.error(e); }
        }

        const marketRes = await api.get(`/shops/marketplace/?q=${slug}&page_size=50`);
        if (marketRes.data.results?.length > 0) {
          const firstProduct = marketRes.data.results[0];
          const shopData = firstProduct.shop || {};
          setShop(shopData);
          const shopId = shopData.id || firstProduct.shop?.id;
          if (shopId) {
            const productsRes = await api.get(`/shops/${shopId}/products/list/`);
            setAllProducts(productsRes.data || []);
          }
        } else {
          const myShopsRes = await api.get('/shops/my/');
          const found = (myShopsRes.data || []).find(s => s.slug === slug || String(s.id) === String(slug));
          if (found) {
            setShop(found);
            const productsRes = await api.get(`/shops/${found.id}/products/list/`);
            setAllProducts(productsRes.data || []);
          }
        }
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    fetchShop();
  }, [slug]);

  // وضعیت‌های موجود
  const availableConditions = useMemo(() => {
    const set = new Set();
    allProducts.forEach(p => {
      if (p.condition) set.add(p.condition);
    });
    return Array.from(set);
  }, [allProducts]);

  const conditionLabels = {
    new: '🟢 نو',
    like_new: '🔵 در حد نو',
    used: '🟠 کارکرده',
    needs_repair: '🔴 نیاز به تعمیر',
  };

  // فیلتر و مرتب‌سازی
  const filteredProducts = useMemo(() => {
    let list = [...allProducts];
    if (conditionFilter) list = list.filter(p => p.condition === conditionFilter);
    if (minPrice) list = list.filter(p => Number(p.price) >= Number(minPrice.replace(/,/g, '')));
    if (maxPrice) list = list.filter(p => Number(p.price) <= Number(maxPrice.replace(/,/g, '')));
    if (sortBy === 'price_asc') list.sort((a, b) => Number(a.price) - Number(b.price));
    else if (sortBy === 'price_desc') list.sort((a, b) => Number(b.price) - Number(a.price));
    else list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return list;
  }, [allProducts, conditionFilter, minPrice, maxPrice, sortBy]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin" /></div>;
  if (!shop) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">🏪</div>
        <h2 className="text-xl font-bold text-gray-700 mb-4">فروشگاه یافت نشد</h2>
        <Link to="/marketplace" className="text-pink-600 hover:underline">← بازگشت به بازارچه</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fdf2f8]">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-pink-100">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-base font-bold bg-gradient-to-r from-pink-700 to-pink-500 bg-clip-text text-transparent">راسته بازار</Link>
          <Link to="/marketplace" className="text-sm bg-pink-600 text-white px-4 py-2 rounded-xl hover:bg-pink-700 transition-all">🛍️ بازارچه</Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* بنر */}
        {shop.banner_url && (
          <div className="rounded-3xl overflow-hidden mb-6 h-40 md:h-64">
            <img src={shop.banner_url} alt={shop.name} className="w-full h-full object-cover" />
          </div>
        )}

        {/* هدر فروشگاه */}
        <div className="bg-white rounded-3xl p-6 mb-4 border shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold overflow-hidden bg-gradient-to-br from-pink-400 to-pink-600 text-white">
              {shop.logo_url ? <img src={shop.logo_url} alt={shop.name} className="w-full h-full object-cover" /> : shop.name?.[0] || 'ف'}
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">{shop.name}</h1>
              <button onClick={() => setShowDetails(!showDetails)} className="text-sm text-gray-500 flex items-center gap-1 hover:text-pink-600 transition-colors">
                مشخصات {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showDetails && (
                <div className="mt-2 space-y-1 text-sm text-gray-600">
                  {shop.owner_name && <p>👤 فروشنده: {shop.owner_name}</p>}
                  {shop.city && <p>📍 شهر: {shop.city}</p>}
                  {shop.address && <p>🏠 آدرس: {shop.address}</p>}
                  {shop.contact_phone && <p>📞 تماس: {shop.contact_phone}</p>}
                  <p>📦 تعداد محصولات: {allProducts.length}</p>
                </div>
              )}
            </div>
            <div className="mr-auto flex items-center gap-2">
              <button onClick={() => setShowFilters(!showFilters)}
                className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-200 transition-all">
                <SlidersHorizontal size={18} />
              </button>
              <button onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-200 transition-all">
                {viewMode === 'grid' ? <List size={18} /> : <LayoutGrid size={18} />}
              </button>
            </div>
          </div>
        </div>

        {/* فیلترها */}
        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-4">
              <div className="bg-white rounded-3xl p-4 border shadow-sm space-y-3">
                <div>
                  <button onClick={() => setShowSort(!showSort)} className="flex items-center gap-1 text-sm text-gray-600 font-medium">
                    مرتب‌سازی {showSort ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  {showSort && (
                    <div className="flex items-center gap-3 flex-wrap mt-2">
                      {[{value: 'newest', label: 'جدیدترین'}, {value: 'price_asc', label: 'ارزان‌ترین'}, {value: 'price_desc', label: 'گران‌ترین'}].map(opt => (
                        <button key={opt.value} onClick={() => setSortBy(opt.value)} className={`text-xs px-3 py-1.5 rounded-xl ${sortBy === opt.value ? 'bg-pink-600 text-white' : 'bg-gray-50'}`}>{opt.label}</button>
                      ))}
                    </div>
                  )}
                </div>
                {availableConditions.length > 0 && (
                  <div>
                    <button onClick={() => setShowCondition(!showCondition)} className="flex items-center gap-1 text-sm text-gray-600 font-medium">
                      وضعیت کالا {showCondition ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    {showCondition && (
                      <div className="flex items-center gap-3 flex-wrap mt-2">
                        <button onClick={() => setConditionFilter('')} className={`text-xs px-3 py-1.5 rounded-xl ${!conditionFilter ? 'bg-pink-600 text-white' : 'bg-gray-50'}`}>همه</button>
                        {availableConditions.map(c => (
                          <button key={c} onClick={() => setConditionFilter(c)} className={`text-xs px-3 py-1.5 rounded-xl ${conditionFilter === c ? 'bg-pink-600 text-white' : 'bg-gray-50'}`}>{conditionLabels[c]}</button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div>
                  <button onClick={() => setShowPrice(!showPrice)} className="flex items-center gap-1 text-sm text-gray-600 font-medium">
                    قیمت {showPrice ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  {showPrice && (
                    <div className="flex items-center gap-2 mt-2">
                      <input type="text" value={minPrice} onChange={e => setMinPrice(e.target.value.replace(/[^0-9]/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ','))} placeholder="از" className="text-xs px-3 py-1.5 border rounded-xl w-24" dir="ltr" />
                      <span className="text-gray-400">-</span>
                      <input type="text" value={maxPrice} onChange={e => setMaxPrice(e.target.value.replace(/[^0-9]/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ','))} placeholder="تا" className="text-xs px-3 py-1.5 border rounded-xl w-24" dir="ltr" />
                      <span className="text-xs text-gray-500">تومان</span>
                    </div>
                  )}
                </div>
                <button onClick={() => { setConditionFilter(''); setMinPrice(''); setMaxPrice(''); setSortBy('newest'); }} className="text-xs text-red-500 hover:text-red-700">حذف فیلترها</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* محصولات */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-20"><div className="text-6xl mb-4">📦</div><h3 className="text-lg font-bold text-gray-700">محصولی یافت نشد</h3></div>
        ) : viewMode === 'grid' ? (
          <motion.div variants={stagger} initial="initial" animate="animate" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {filteredProducts.map(product => {
              const colorHex = COLORS.find(c => c.name === product.color)?.hex;
              return (
                <motion.div key={product.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -4 }}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all overflow-hidden group">
                  <Link to={`/product/${product.id}`}>
                    <div className="aspect-square bg-gradient-to-br from-pink-50 to-pink-100 flex items-center justify-center relative overflow-hidden">
                      {product.image_url ? <img src={product.image_url} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <div className="text-5xl">🛍️</div>}
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-gray-800 text-sm mb-1 line-clamp-1">{product.title}</h3>
                      <div className="flex items-center gap-2 mt-1 mb-1">
                        {product.colors && Object.keys(product.colors).length > 0 ? (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">🎨 رنگ‌بندی</span>
                        ) : product.color && (colorHex ? 
                          <div style={{ width: "14px", height: "14px", borderRadius: "50%", backgroundColor: colorHex, border: "1px solid #d1d5db", display: "inline-block" }} /> : 
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{product.color}</span>
                        )}
                        {product.stock === 0 ? <span className="text-xs text-red-500 font-bold">اتمام موجودی</span> : product.stock <= 5 ? <span className="text-xs text-red-500">موجودی فقط {product.stock} عدد</span> : <span className="text-xs text-gray-400">موجودی {product.stock} عدد</span>}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-base font-extrabold text-gray-900">{Number(product.price).toLocaleString('fa-IR')}<span className="text-xs text-gray-500 font-normal mr-1">تومان</span></span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <div className="space-y-3">
            {filteredProducts.map(product => (
              <Link key={product.id} to={`/product/${product.id}`}
                className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center gap-4">
                <div className="w-12 h-12 bg-pink-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0 overflow-hidden">{product.image_url ? <img src={product.image_url} alt="" className="w-full h-full object-cover" /> : '🛍️'}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm text-gray-800 truncate">{product.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-extrabold text-pink-600">{Number(product.price).toLocaleString('fa-IR')} تومان</span>
                    {product.stock === 0 ? <span className="text-xs text-red-500">اتمام</span> : product.stock <= 5 ? <span className="text-xs text-red-500">فقط {product.stock} عدد</span> : <span className="text-xs text-gray-400">موجودی {product.stock}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
