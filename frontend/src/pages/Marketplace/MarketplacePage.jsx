import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal, Star, Truck, Handshake, X, Store, Tag } from 'lucide-react';
import api from '../../services/api';
import { stagger } from '../../utils/animations';

const COLORS = [
  { name: 'قرمز', hex: '#dc2626' }, { name: 'آبی', hex: '#2563eb' }, { name: 'سبز', hex: '#16a34a' },
  { name: 'زرد', hex: '#eab308' }, { name: 'نارنجی', hex: '#f97316' }, { name: 'بنفش', hex: '#9333ea' },
  { name: 'صورتی', hex: '#ec4899' }, { name: 'سرخابی', hex: '#db2777' }, { name: 'مشکی', hex: '#1f2937' },
  { name: 'سفید', hex: '#f9fafb' }, { name: 'کرم', hex: '#fef3c7' }, { name: 'قهوه‌ای', hex: '#92400e' },
  { name: 'خاکستری', hex: '#6b7280' }, { name: 'نیلی', hex: '#312e81' }, { name: 'فیروزه‌ای', hex: '#0891b2' },
];

const CONDITIONS = [
  { value: '', label: 'همه' }, { value: 'new', label: '🟢 نو' },
  { value: 'like_new', label: '🔵 در حد نو' }, { value: 'used', label: '🟠 کارکرده' },
  { value: 'needs_repair', label: '🔴 نیاز به تعمیر' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'جدیدترین' }, { value: 'price_asc', label: 'ارزان‌ترین' },
  { value: 'price_desc', label: 'گران‌ترین' }, { value: 'popular', label: 'پرفروش‌ترین' },
  { value: 'rating', label: 'بالاترین امتیاز' },
];

const CATEGORIES = [
  '📱 موبایل و تبلت', '💻 لپتاپ و کامپیوتر', '👗 پوشاک', '👟 کفش و کیف',
  '🍔 خوراکی', '🏠 لوازم خانگی', '📚 کتاب و لوازم التحریر', '💄 آرایشی و بهداشتی',
  '🧸 اسباب بازی', '⚽ ورزشی', '🚗 خودرو', '🏠 املاک', '🏪 سایر',
];

function ProductCard({ product }) {
  const colorHex = COLORS.find(c => c.name === product.color)?.hex;
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -4 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all overflow-hidden group">
      <Link to={`/product/${product.id}`}>
        <div className="aspect-square bg-gradient-to-br from-pink-50 to-pink-100 flex items-center justify-center relative overflow-hidden">
          {product.image ? <img src={product.image} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <div className="text-5xl">🛍️</div>}
          <div className="absolute top-2 right-2 flex flex-col gap-1">
            {product.allow_courier && <span className="bg-white/90 backdrop-blur-sm text-xs px-2 py-1 rounded-full text-pink-600 flex items-center gap-1"><Truck size={12} /> پیک</span>}
            {product.allow_local_test && <span className="bg-white/90 backdrop-blur-sm text-xs px-2 py-1 rounded-full text-green-600 flex items-center gap-1"><Handshake size={12} /> تست</span>}
          </div>
          {product.condition !== 'new' && <div className="absolute top-2 left-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full">{product.condition === 'used' ? 'کارکرده' : product.condition === 'like_new' ? 'در حد نو' : 'نیاز به تعمیر'}</div>}
        </div>
        <div className="p-4">
          <h3 className="font-bold text-gray-800 text-sm mb-1 line-clamp-1">{product.title}</h3>
          <p className="text-xs text-gray-500 truncate">{product.shop?.name || 'فروشگاه'}</p>
          {product.owner_name && <p className="text-xs text-gray-400">{product.owner_name}</p>}
          <div className="flex items-center gap-2 mt-1 mb-1">
            {product.colors && Object.keys(product.colors).length > 0 ? (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">🎨 رنگ‌بندی</span>
            ) : product.color && (colorHex ? 
              <div style={{ width: "14px", height: "14px", borderRadius: "50%", backgroundColor: colorHex, border: "1px solid #d1d5db", display: "inline-block" }} /> : 
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{product.color}</span>
            )}
            {product.stock === 0 ? <span className="text-xs text-red-500 font-bold">اتمام موجودی</span> : product.stock <= 3 ? <span className="text-xs text-red-500">موجودی فقط {product.stock} عدد</span> : <span className="text-xs text-gray-400">موجودی {product.stock} عدد</span>}
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-base font-extrabold text-gray-900">{Number(product.price).toLocaleString('fa-IR')}<span className="text-xs text-gray-500 font-normal mr-1">تومان</span></span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function MarketplacePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [condition, setCondition] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [hasCourier, setHasCourier] = useState(false);
  const [allowTest, setAllowTest] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [suggestions, setSuggestions] = useState({ products: [], shops: [] });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [shopNameFilter, setShopNameFilter] = useState('');
  const [shopSuggestions, setShopSuggestions] = useState([]);
  const [showShopSuggestions, setShowShopSuggestions] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('q', search);
      if (condition) params.append('condition', condition);
      if (minPrice) params.append('min_price', minPrice);
      if (maxPrice) params.append('max_price', maxPrice);
      if (hasCourier) params.append('has_courier', 'true');
      if (allowTest) params.append('allow_local_test', 'true');
      if (sortBy) params.append('sort_by', sortBy);
      if (categoryFilter) params.append('category', categoryFilter);
      if (shopNameFilter) params.append('shop_name', shopNameFilter);
      params.append('page', page); params.append('page_size', '12');
      const response = await api.get(`/shops/marketplace/?${params.toString()}`);
      setProducts(response.data.results || []); setTotalCount(response.data.count || 0); setTotalPages(response.data.total_pages || 1);
    } catch (e) {} finally { setLoading(false); }
  }, [search, condition, minPrice, maxPrice, hasCourier, allowTest, sortBy, categoryFilter, shopNameFilter, page]);

  const fetchSuggestions = useCallback(async (q) => {
    if (q.length < 2) { setSuggestions({ products: [], shops: [] }); return; }
    try { const r = await api.get(`/shops/marketplace/suggestions/?q=${q}`); setSuggestions(r.data); setShowSuggestions(true); } catch (e) {}
  }, []);

  const fetchShopSuggestions = useCallback(async (q) => {
    if (q.length < 3) { setShopSuggestions([]); return; }
    try { const r = await api.get(`/shops/marketplace/suggestions/?q=${q}`); setShopSuggestions(r.data.shops || []); setShowShopSuggestions(true); } catch (e) {}
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { const t = setTimeout(() => fetchSuggestions(search), 300); return () => clearTimeout(t); }, [search]);

  const resetFilters = () => { setCondition(''); setMinPrice(''); setMaxPrice(''); setHasCourier(false); setAllowTest(false); setSortBy('newest'); setCategoryFilter(''); setShopNameFilter(''); setPage(1); };
  const hasActiveFilters = condition || minPrice || maxPrice || hasCourier || allowTest || categoryFilter || shopNameFilter;

  return (
    <div className="min-h-screen bg-[#fdf2f8]">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-pink-100">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-base font-bold bg-gradient-to-r from-pink-700 to-pink-500 bg-clip-text text-transparent">راسته بازار</Link>
          <Link to="/" className="text-sm text-gray-500 hover:text-pink-600">← بازگشت</Link>
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-4 py-4">
        <form onSubmit={(e) => { e.preventDefault(); setShowSuggestions(false); fetchProducts(); }} className="relative mb-4">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            onFocus={() => search.length >= 2 && setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="جستجوی محصول، فروشگاه..." className="w-full pr-12 pl-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm" />
          {showSuggestions && (suggestions.products?.length > 0 || suggestions.shops?.length > 0) && (
            <div className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-xl border p-2 z-50">
              {suggestions.products?.map(p => (
                <button key={p.id} onMouseDown={() => { setSearch(p.title); setShowSuggestions(false); }} className="w-full text-right px-4 py-2 hover:bg-pink-50 rounded-xl text-sm flex items-center justify-between">
                  <span>{p.title}</span><span className="text-xs text-gray-500">{Number(p.price).toLocaleString('fa-IR')} تومان</span>
                </button>
              ))}
            </div>
          )}
        </form>

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl ${showFilters || hasActiveFilters ? 'bg-pink-600 text-white' : 'bg-white border hover:border-pink-300'}`}><SlidersHorizontal size={16} />فیلترها</button>
          {SORT_OPTIONS.map(opt => (<button key={opt.value} onClick={() => { setSortBy(opt.value); setPage(1); }} className={`text-xs px-3 py-2 rounded-xl whitespace-nowrap ${sortBy === opt.value ? 'bg-pink-600 text-white' : 'bg-white border hover:border-pink-300'}`}>{opt.label}</button>))}
          <button onClick={() => { setHasCourier(!hasCourier); setPage(1); }} className={`text-xs px-3 py-2 rounded-xl flex items-center gap-1 ${hasCourier ? 'bg-pink-600 text-white' : 'bg-white border'}`}><Truck size={14} />پیک</button>
          <button onClick={() => { setAllowTest(!allowTest); setPage(1); }} className={`text-xs px-3 py-2 rounded-xl flex items-center gap-1 ${allowTest ? 'bg-pink-600 text-white' : 'bg-white border'}`}><Handshake size={14} />تست</button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-4">
              <div className="bg-white rounded-2xl p-4 border space-y-4">
                <div>
                  <label className="text-xs text-gray-500 mb-2 flex items-center gap-1"><Tag size={14} /> دسته‌بندی</label>
                  <div className="flex gap-1.5 flex-wrap">
                    <button onClick={() => { setCategoryFilter(''); setPage(1); }} className={`text-xs px-3 py-1.5 rounded-xl ${!categoryFilter ? 'bg-pink-100 text-pink-700' : 'bg-gray-50'}`}>همه</button>
                    {CATEGORIES.map(c => (<button key={c} onClick={() => { setCategoryFilter(c); setPage(1); }} className={`text-xs px-3 py-1.5 rounded-xl ${categoryFilter === c ? 'bg-pink-100 text-pink-700' : 'bg-gray-50'}`}>{c}</button>))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-2 flex items-center gap-1"><Store size={14} /> نام فروشگاه</label>
                  <div className="relative">
                    <input type="text" value={shopNameFilter} onChange={e => { setShopNameFilter(e.target.value); setPage(1); fetchShopSuggestions(e.target.value); }}
                      onFocus={() => shopSuggestions.length > 0 && setShowShopSuggestions(true)} onBlur={() => setTimeout(() => setShowShopSuggestions(false), 200)}
                      placeholder="حداقل ۳ حرف تایپ کنید..." className="w-full px-4 py-2 border rounded-xl text-sm" />
                    {showShopSuggestions && shopSuggestions.length > 0 && (
                      <div className="absolute top-full mt-1 w-full bg-white rounded-xl shadow-lg border z-50 max-h-40 overflow-y-auto">
                        {shopSuggestions.map(shop => (
                          <button key={shop.id} type="button" onMouseDown={() => { setShopNameFilter(shop.name); setShowShopSuggestions(false); setPage(1); }}
                            className="w-full text-right px-4 py-2 hover:bg-pink-50 text-sm">{shop.name}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-2">وضعیت کالا</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {CONDITIONS.map(c => (<button key={c.value} onClick={() => { setCondition(c.value); setPage(1); }} className={`text-xs px-3 py-1.5 rounded-xl ${condition === c.value ? 'bg-pink-100 text-pink-700' : 'bg-gray-50'}`}>{c.label}</button>))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-2">بازه قیمت (تومان)</label>
                  <div className="flex items-center gap-2">
                    <input type="number" value={minPrice} onChange={e => { setMinPrice(e.target.value); setPage(1); }} placeholder="از" className="w-24 text-xs px-2 py-1.5 border rounded-lg" />
                    <span className="text-gray-400">-</span>
                    <input type="number" value={maxPrice} onChange={e => { setMaxPrice(e.target.value); setPage(1); }} placeholder="تا" className="w-24 text-xs px-2 py-1.5 border rounded-lg" />
                  </div>
                </div>
                {hasActiveFilters && <button onClick={resetFilters} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"><X size={14} />حذف همه</button>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-sm text-gray-500 mb-4">{totalCount} محصول پیدا شد</p>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {[...Array(8)].map((_, i) => (<div key={i} className="bg-white rounded-2xl p-4 animate-pulse"><div className="aspect-square bg-gray-100 rounded-xl mb-3" /><div className="h-4 bg-gray-100 rounded mb-2" /><div className="h-3 bg-gray-100 rounded w-2/3" /></div>))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20"><div className="text-6xl mb-4">🔍</div><h3 className="text-lg font-bold text-gray-700">محصولی یافت نشد</h3></div>
        ) : (
          <>
            <motion.div variants={stagger} initial="initial" animate="animate" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {products.map(product => (<ProductCard key={product.id} product={product} />))}
            </motion.div>
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                {[...Array(totalPages)].map((_, i) => (<button key={i} onClick={() => setPage(i + 1)} className={`w-10 h-10 rounded-xl text-sm font-bold ${page === i + 1 ? 'bg-pink-600 text-white' : 'bg-white text-gray-600 hover:bg-pink-50'}`}>{i + 1}</button>))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
