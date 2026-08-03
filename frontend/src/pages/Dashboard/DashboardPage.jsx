import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  User, Package, Star, Wallet, Store, Truck, 
  MessageCircle, Gift, Ticket, LogOut, ChevronLeft,
  ShoppingBag, Clock, CheckCircle, XCircle
} from 'lucide-react';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';
import { fadeIn, stagger } from '../../utils/animations';

export default function DashboardPage() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    fetchData();
  }, [isAuthenticated]);

  const fetchData = async () => {
    try {
      const [ordersRes, walletRes] = await Promise.all([
        api.get('/orders/my/'),
        api.get('/users/wallet/'),
      ]);
      setOrders(ordersRes.data?.slice(0, 5) || []);
      setWallet(walletRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = (status) => {
    const badges = {
      pending_confirmation: { icon: Clock, label: 'در انتظار تأیید', color: 'bg-yellow-100 text-yellow-700' },
      confirmed: { icon: CheckCircle, label: 'تأیید شده', color: 'bg-blue-100 text-blue-700' },
      packed: { icon: Package, label: 'بسته‌بندی شده', color: 'bg-purple-100 text-purple-700' },
      shipped: { icon: Truck, label: 'ارسال شده', color: 'bg-orange-100 text-orange-700' },
      delivered: { icon: CheckCircle, label: 'تحویل شده', color: 'bg-green-100 text-green-700' },
      cancelled: { icon: XCircle, label: 'لغو شده', color: 'bg-red-100 text-red-700' },
    };
    return badges[status] || badges.pending_confirmation;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdf2f8]">
        <div className="w-12 h-12 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin" />
      </div>
    );
  }

  const menuItems = [
    { icon: Store, label: 'فروشگاه‌های من', href: '/seller/shops', color: 'text-pink-600' },
    { icon: Package, label: 'هم‌خریدها', href: '/deals', color: 'text-purple-600' },
    { icon: Truck, label: 'پیک‌ها', href: '/courier', color: 'text-orange-600' },
    { icon: MessageCircle, label: 'پیام‌ها', href: '/chat', color: 'text-blue-600' },
    { icon: Star, label: 'امتیازات', href: '/ratings', color: 'text-yellow-600' },
    { icon: Gift, label: 'باشگاه مشتریان', href: '/loyalty', color: 'text-red-600' },
    { icon: Ticket, label: 'کدهای تخفیف', href: '/discounts', color: 'text-green-600' },
    { icon: Wallet, label: 'کیف پول', href: '/wallet', color: 'text-indigo-600' },
  ];

  return (
    <div className="min-h-screen bg-[#fdf2f8]">
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-pink-100">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-base font-bold bg-gradient-to-r from-pink-700 to-pink-500 bg-clip-text text-transparent">
            راسته بازار
          </Link>
          <button onClick={logout} className="text-sm text-gray-500 hover:text-red-500 flex items-center gap-1">
            <LogOut size={16} /> خروج
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        
        {/* پروفایل */}
        <motion.div variants={fadeIn} initial="initial" animate="animate"
          className="bg-white rounded-3xl p-6 mb-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-pink-400 to-pink-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
              {(user?.first_name?.[0] || user?.phone?.[user.phone.length - 2] || 'ر').toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-gray-900">
                {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : 'کاربر راسته'}
              </h1>
              <p className="text-sm text-gray-500">{user?.phone}</p>
              <span className="inline-block mt-1 text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full">
                {user?.user_type === 'seller' ? '🏪 فروشنده' : 
                 user?.user_type === 'courier' ? '🛵 پیک' : 
                 user?.user_type === 'service_provider' ? '🔧 سرویس‌دهنده' : '🛍️ خریدار'}
              </span>
            </div>
            {wallet && (
              <div className="mr-auto text-left bg-gray-50 rounded-2xl px-4 py-3">
                <p className="text-xs text-gray-500">موجودی کیف پول</p>
                <p className="text-lg font-extrabold text-pink-600">{Number(wallet.balance).toLocaleString('fa-IR')} <span className="text-xs font-normal">تومان</span></p>
              </div>
            )}
          </div>
        </motion.div>

        {/* منو */}
        <motion.div variants={stagger} initial="initial" animate="animate"
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {menuItems.map((item, i) => (
            <motion.div key={i} variants={fadeIn}>
              <Link to={item.href}
                className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md hover:border-pink-100 transition-all flex flex-col items-center gap-2 text-center">
                <item.icon className={`w-8 h-8 ${item.color}`} />
                <span className="text-xs font-bold text-gray-700">{item.label}</span>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {/* سفارش‌های اخیر */}
        <motion.div variants={fadeIn} initial="initial" animate="animate"
          className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-extrabold text-gray-800 flex items-center gap-2">
              <ShoppingBag size={20} className="text-pink-600" />
              سفارش‌های اخیر
            </h2>
            <Link to="/orders" className="text-sm text-pink-600 hover:underline flex items-center gap-1">
              همه <ChevronLeft size={14} />
            </Link>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-5xl mb-3">📦</div>
              <p className="text-gray-500 text-sm">هنوز سفارشی ثبت نکردی!</p>
              <Link to="/marketplace" className="text-pink-600 text-sm hover:underline mt-2 inline-block">بریم خرید؟ 🛍️</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                const badge = statusBadge(order.status);
                const BadgeIcon = badge.icon;
                return (
                  <Link key={order.id} to={`/orders/${order.tracking_code}`}
                    className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100">
                    <div className="w-10 h-10 bg-pink-50 rounded-xl flex items-center justify-center flex-shrink-0">🛍️</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800 truncate">{order.product_title}</p>
                      <p className="text-xs text-gray-500">{order.tracking_code}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${badge.color}`}>
                      <BadgeIcon size={12} /> {badge.label}
                    </span>
                    <span className="text-sm font-bold text-gray-700">{Number(order.final_price).toLocaleString('fa-IR')} تومان</span>
                  </Link>
                );
              })}
            </div>
          )}
        </motion.div>

      </main>
    </div>
  );
}
