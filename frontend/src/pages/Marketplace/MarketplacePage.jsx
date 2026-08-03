import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Search, SlidersHorizontal, MapPin, Star, Truck, Handshake, X } from 'lucide-react';
import api from '../../services/api';
import { fadeIn, stagger } from '../../utils/animations';

const CONDITIONS = [
  { value: '', label: 'همه' },
  { value: 'new', label: '🟢 نو' },
  { value: 'like_new', label: '🔵 در حد نو' },
  { value: 'used', label: '🟠 کارکرده' },
  { value: 'needs_repair', label: '🔴 نیاز به تعمیر' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'جدیدترین' },
  { value: 'price_asc', label: 'ارزان‌ترین' },
  { value: 'price_desc', label: 'گران‌ترین' },
  { value: 'popular', label: 'پرفروش‌ترین' },
  { value: 'rating', label: 'بالاترین امتیاز' },
];

function ProductCard({ product }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all overflow-hidden group"
    >
      <Link to={`/product/${product.id}`}>
        {/* تصویر */}
        <div className="aspect-square bg-gradient-to-br from-pink-50 to-pink-100 flex items-center justify-center relative overflow-hidden">
          {product.image ? (
            <img src={product.image} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="text-5xl">🛍️</div>
          )}
          
          {/* برچسب‌ها */}
          <div className="absolute top-2 right-2 flex flex-col gap-1">
            {product.allow_courier && (
              <span className="bg-white/90 backdrop-blur-sm text-xs px-2 py-1 rounded-full text-pink-600 flex items-center gap-1">
                <Truck size={12} /> پیک
              </span>
            )}
            {product.allow_local_test && (
              <span className="bg-white/90 backdrop-blur-sm text-xs px-2 py-1 rounded-full text-green-600 flex items-center gap-1">
                <Handshake size={12} /> تست
              </span>
            )}
          </div>
          
          {/* وضعیت کالا */}
          {product.condition !== 'new' && (
            <div className="absolute top-2 left-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
              {product.condition === 'used' ? 'کارکرده' : product.condition === 'like_new' ? 'در حد نو' : 'نیاز به تعمیر'}
            </div>
          )}
        </div>
        
        {/* اطلاعات */}
        <div className="p-4">
          <h3 className="font-bold text-gray-800 text-sm mb-1 line-clamp-1">{product.title}</h3>
          
          {/* فروشگاه و امتیاز */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-gray-500 truncate">{product.shop?.name || 'فروشگاه'}</span>
            {product.shop_rating > 0 && (
              <span className="text-xs text-yellow-600 flex items-center gap-0.5">
                <Star size={12} fill="currentColor" /> {product.shop_rating}
              </span>
            )}
          </div>
          
          {/* قیمت */}
          <div className="flex items-center justify-between">
            <span className="text-base font-extrabold text-gray-900">
              {Number(product.price).toLocaleString('fa-IR')}
              <span className="text-xs text-gray-500 font-normal mr-1">تومان</span>
            </span>
            {product.sales_count > 0 && (
              <span className="text-xs text-gray-400">{product.sales_count} فروش</span>
            )}
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
  
  // فیلترها
  const [search, setSearch] = useState('');
  const [condition, setCondition] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [hasCourier, setHasCourier] = useState(false);
  const [allowTest, setAllowTest] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);
  
  // پیشنهادات جستجو
  const [suggestions, setSuggestions] = useState({ products: [], shops: [] });
  const [showSuggestions, setShowSuggestions] = useState(false);

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
      params.append('sort_by', sortBy);
      params.append('page', page);
      params.append('page_size', '12');
      
      const response = await api.get(`/shops/marketplace/?${params.toString()}`);
      setProducts(response.data.results || []);
      setTotalCount(response.data.count || 0);
      setTotalPages(response.data.total_pages || 1);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  }, [search, condition, minPrice, maxPrice, hasCourier, allowTest, sortBy, page]);

  const fetchSuggestions = useCallback(async (q) => {
    if (q.length < 2) {
      setSuggestions({ products: [], shops: [] });
      return;
    }
    try {
      const response = await api.get(`/shops/marketplace/suggestions/?q=${q}`);
      setSuggestions(response.data);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    const timer = setTimeout(() => fetchSuggestions(search), 300);
    return () => clearTimeout(timer);
  }, [search, fetchSuggestions]);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setShowSuggestions(false);
    fetchProducts();
  };

  const resetFilters = () => {
    setCondition('');
    setMinPrice('');
    setMaxPrice('');
    setHasCourier(false);
    setAllowTest(false);
    setSortBy('newest');
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-[#fdf2f8]">
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-pink-100">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-base font-bold bg-gradient-to-r from-pink-700 to-pink-500 bg-clip-text text-transparent">
            راسته بازار
          </Link>
          <Link to="/" className="text-sm text-gray-500 hover:text-pink-600">
            ← بازگشت
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-4">
        
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative mb-4">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            onFocus={() => search.length >= 2 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="جستجوی محصول، فروشگاه، برند..."
            className="w-full pr-12 pl-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
          />
          
          {/* Autocomplete Suggestions */}
          {showSuggestions && (suggestions.products?.length > 0 || suggestions.shops?.length > 0) && (
            <div className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50">
              {suggestions.products?.map(p => (
                <button
                  key={p.id}
                  onMouseDown={() => { setSearch(p.title); setShowSuggestions(false); }}
                  className="w-full text-right px-4 py-2 hover:bg-pink-50 rounded-xl text-sm flex items-center justify-between"
                >
                  <span>{p.title}</span>
                  <span className="text-xs text-gray-500">{Number(p.price).toLocaleString('fa-IR')} تومان</span>
                </button>
              ))}
            </div>
          )}
        </form>

        {/* Filter Bar */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 text-sm bg-white border border-gray-200 px-3 py-2 rounded-xl hover:border-pink-300 transition-colors"
          >
            <SlidersHorizontal size={16} />
            فیلترها
          </button>
          
          {/* Sort */}
          <div className="flex gap-1.5 overflow-x-auto">
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => { setSortBy(opt.value); setPage(1); }}
                className={`text-xs px-3 py-2 rounded-xl whitespace-nowrap transition-all ${
                  sortBy === opt.value
                    ? 'bg-pink-600 text-white'
                    : 'bg-white border border-gray-200 hover:border-pink-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          
          {/* Quick Filters */}
          <button
            onClick={() => { setHasCourier(!hasCourier); setPage(1); }}
            className={`text-xs px-3 py-2 rounded-xl flex items-center gap-1 transition-all ${
              hasCourier ? 'bg-pink-600 text-white' : 'bg-white border border-gray-200'
            }`}
          >
            <Truck size={14} /> پیک
          </button>
          <button
            onClick={() => { setAllowTest(!allowTest); setPage(1); }}
            className={`text-xs px-3 py-2 rounded-xl flex items-center gap-1 transition-all ${
              allowTest ? 'bg-pink-600 text-white' : 'bg-white border border-gray-200'
            }`}
          >
            <Handshake size={14} /> تست حضوری
          </button>
        </div>

        {/* Extended Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-4"
            >
              <div className="bg-white rounded-2xl p-4 border border-gray-100 flex flex-wrap gap-4 items-end">
                {/* Condition */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">وضعیت کالا</label>
                  <div className="flex gap-1 flex-wrap">
                    {CONDITIONS.map(c => (
                      <button
                        key={c.value}
                        onClick={() => { setCondition(c.value); setPage(1); }}
                        className={`text-xs px-2.5 py-1.5 rounded-lg transition-all ${
                          condition === c.value ? 'bg-pink-100 text-pink-700' : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Price Range */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">بازه قیمت (تومان)</label>
                  <div className="flex items-center gap-2">
                    <input type="number" value={minPrice} onChange={(e) => { setMinPrice(e.target.value); setPage(1); }}
                      placeholder="از" className="w-24 text-xs px-2 py-1.5 border rounded-lg" />
                    <span className="text-gray-400">-</span>
                    <input type="number" value={maxPrice} onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }}
                      placeholder="تا" className="w-24 text-xs px-2 py-1.5 border rounded-lg" />
                  </div>
                </div>
                
                {/* Reset */}
                <button onClick={resetFilters} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                  <X size={14} /> حذف فیلترها
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Count */}
        <p className="text-sm text-gray-500 mb-4">{totalCount} محصول پیدا شد</p>

        {/* Product Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
                <div className="aspect-square bg-gray-100 rounded-xl mb-3" />
                <div className="h-4 bg-gray-100 rounded mb-2" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-lg font-bold text-gray-700 mb-2">محصولی یافت نشد</h3>
            <p className="text-gray-500 text-sm">فیلترها رو تغییر بده یا یه عبارت دیگه جستجو کن</p>
          </div>
        ) : (
          <>
            <motion.div variants={stagger} initial="initial" animate="animate"
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {products.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </motion.div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${
                      page === i + 1 ? 'bg-pink-600 text-white' : 'bg-white text-gray-600 hover:bg-pink-50'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
