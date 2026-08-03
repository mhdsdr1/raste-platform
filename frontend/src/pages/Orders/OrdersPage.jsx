import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Filter, X, ChevronLeft, ChevronRight,
  Clock, CheckCircle, Package, Truck, XCircle,
  ShoppingBag
} from 'lucide-react';
import api from '../../services/api';
import { fadeIn, stagger } from '../../utils/animations';

const STATUSES = [
  { value: '', label: 'همه', icon: ShoppingBag },
  { value: 'pending_confirmation', label: 'در انتظار', icon: Clock, color: 'bg-yellow-100 text-yellow-700' },
  { value: 'confirmed', label: 'تأیید شده', icon: CheckCircle, color: 'bg-blue-100 text-blue-700' },
  { value: 'packed', label: 'بسته‌بندی', icon: Package, color: 'bg-purple-100 text-purple-700' },
  { value: 'shipped', label: 'ارسال شده', icon: Truck, color: 'bg-orange-100 text-orange-700' },
  { value: 'delivered', label: 'تحویل شده', icon: CheckCircle, color: 'bg-green-100 text-green-700' },
  { value: 'cancelled', label: 'لغو شده', icon: XCircle, color: 'bg-red-100 text-red-700' },
];

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  // فیلترها
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);
      params.append('page', page);
      params.append('page_size', '10');
      
      const response = await api.get(`/orders/my/?${params.toString()}`);
      setOrders(response.data || []);
      // TODO: بک‌اند باید total_pages و count رو برگردونه
      setTotalPages(Math.ceil((response.data?.length || 0) / 10) || 1);
      setTotalCount(response.data?.length || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, page]);

  const statusBadge = (status) => {
    return STATUSES.find(s => s.value === status) || STATUSES[0];
  };

  const resetFilters = () => {
    setStatusFilter('');
    setSearchQuery('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-[#fdf2f8]">
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-pink-100">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-base font-bold bg-gradient-to-r from-pink-700 to-pink-500 bg-clip-text text-transparent">
            راسته بازار
          </Link>
          <Link to="/dashboard" className="text-sm text-gray-500 hover:text-pink-600">
            ← داشبورد
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        
        {/* عنوان و جستجو */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
            <ShoppingBag className="text-pink-600" size={22} />
            سفارش‌های من
            <span className="text-sm font-normal text-gray-500">({totalCount})</span>
          </h1>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 text-sm bg-white border border-gray-200 px-3 py-2 rounded-xl hover:border-pink-300 transition-colors"
          >
            <Filter size={16} />
            فیلترها
          </button>
        </div>

        {/* فیلترها */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-4"
            >
              <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-4">
                {/* Status Filter */}
                <div>
                  <label className="block text-xs text-gray-500 mb-2">وضعیت سفارش</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {STATUSES.map(s => {
                      const Icon = s.icon;
                      return (
                        <button
                          key={s.value}
                          onClick={() => { setStatusFilter(s.value); setPage(1); }}
                          className={`text-xs px-3 py-1.5 rounded-xl flex items-center gap-1 transition-all ${
                            statusFilter === s.value
                              ? 'bg-pink-600 text-white'
                              : s.color || 'bg-gray-50 hover:bg-gray-100'
                          }`}
                        >
                          {s.value !== '' && <Icon size={14} />}
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Search */}
                <div>
                  <label className="block text-xs text-gray-500 mb-2">جستجوی محصول</label>
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="نام محصول..."
                      className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-pink-500"
                    />
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

        {/* Orders List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-lg font-bold text-gray-700 mb-2">سفارشی پیدا نشد</h3>
            <p className="text-gray-500 text-sm mb-4">هنوز هیچ سفارشی ثبت نکردی!</p>
            <Link to="/marketplace" className="text-pink-600 hover:underline font-bold">بریم خرید؟ 🛍️</Link>
          </div>
        ) : (
          <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-3">
            {orders.map((order) => {
              const badge = statusBadge(order.status);
              const BadgeIcon = badge.icon;
              return (
                <motion.div key={order.id} variants={fadeIn}>
                  <Link
                    to={`/orders/${order.tracking_code}`}
                    className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md hover:border-pink-100 transition-all flex items-center gap-4"
                  >
                    {/* Product Icon */}
                    <div className="w-12 h-12 bg-pink-50 rounded-xl flex items-center justify-center flex-shrink-0 text-xl">
                      🛍️
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm text-gray-800 truncate">{order.product_title}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{order.shop_name}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString('fa-IR')}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${badge.color}`}>
                          <BadgeIcon size={12} /> {badge.label}
                        </span>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-left flex-shrink-0">
                      <p className="text-sm font-extrabold text-gray-900">
                        {Number(order.final_price || order.total_price).toLocaleString('fa-IR')}
                      </p>
                      <p className="text-xs text-gray-500">تومان</p>
                    </div>

                    <ChevronLeft size={18} className="text-gray-400 flex-shrink-0" />
                  </Link>
                </motion.div>
              );
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center disabled:opacity-30 hover:border-pink-300 transition-all"
                >
                  <ChevronRight size={18} />
                </button>
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
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center disabled:opacity-30 hover:border-pink-300 transition-all"
                >
                  <ChevronLeft size={18} />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
}
