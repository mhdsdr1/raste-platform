import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  User, Package, Star, Wallet, Store, Truck, 
  MessageCircle, Gift, Ticket, LogOut, ChevronLeft,
  ShoppingBag, Clock, CheckCircle, XCircle, BarChart3
} from 'lucide-react';
import api from '../../services/api';
import JalaliCalendar from '../../components/JalaliCalendar';
import { IRAN_PROVINCES, getCitiesForProvince } from '../../utils/iranLocations';
import { toast } from 'sonner';
import useAuthStore from '../../store/authStore';
import { fadeIn, stagger } from '../../utils/animations';

export default function DashboardPage() {
  const { user, isAuthenticated, logout, fetchUser } = useAuthStore();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({});
  const [profileLoading, setProfileLoading] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [addressForm, setAddressForm] = useState({ title: '', receiver_name: '', receiver_phone: '', province: '', city: '', postal_code: '', full_address: '', is_default: false });
  const [addressErrors, setAddressErrors] = useState({});
  const [profileErrors, setProfileErrors] = useState({});
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

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
    { icon: BarChart3, label: 'داشبورد مالی', href: '/seller/analytics', color: 'text-green-600' },
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
          className="bg-white rounded-3xl p-6 mb-6 border border-gray-100 shadow-sm cursor-pointer hover:shadow-md transition-all"
          onClick={() => {
            setProfileForm({
              first_name: user?.first_name || '',
              last_name: user?.last_name || '',
              email: user?.email || '',
              national_id: user?.national_id || '',
              birthday: user?.birthday || '',
            });
            setShowProfileModal(true);
            api.get('/users/addresses/').then(r => setAddresses(r.data || [])).catch(() => {});
          }}>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-pink-400 to-pink-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
              {user?.avatar ? (
                <img src={user.avatar} className="w-full h-full object-cover" alt="avatar" />
              ) : (
                (user?.first_name?.[0] || user?.phone?.[user.phone.length - 2] || 'ر').toUpperCase()
              )}
            </div>
            <div className="flex-1">
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
      
      {/* مودال پروفایل */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3" onClick={() => setShowProfileModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            {/* هدر */}
            <div className="flex items-center justify-between p-3 bg-gradient-to-l from-pink-500 to-pink-600">
              <h3 className="font-bold text-white text-sm">👤 پروفایل من</h3>
              <button onClick={() => setShowProfileModal(false)} className="text-white text-lg">✕</button>
            </div>
            
            <div className="p-3 overflow-y-auto flex-1 space-y-3">
              {/* آواتار */}
              <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                <div className="w-14 h-14 rounded-full bg-pink-100 flex items-center justify-center overflow-hidden">
                  {avatarPreview ? (
                    <img src={avatarPreview} className="w-full h-full object-cover" />
                  ) : user?.avatar ? (
                    <img src={user.avatar} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl text-pink-500">
                      {(user?.first_name?.[0] || '👤')}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-gray-500 block mb-1">📷 عکس پروفایل</label>
                  <input 
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setAvatarFile(file);
                        setAvatarPreview(URL.createObjectURL(file));
                      }
                    }}
                    className="text-[10px] w-full"
                  />
                </div>
              </div>
              
              {/* فرم مشخصات */}
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500 mb-0.5 block">نام</label>
                    <input 
                      value={profileForm.first_name || ''} 
                      onChange={e => setProfileForm({...profileForm, first_name: e.target.value})}
                      className="w-full px-2 py-1.5 border rounded-lg text-xs" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 mb-0.5 block">نام خانوادگی</label>
                    <input 
                      value={profileForm.last_name || ''} 
                      onChange={e => setProfileForm({...profileForm, last_name: e.target.value})}
                      className="w-full px-2 py-1.5 border rounded-lg text-xs" 
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 mb-0.5 block">📱 موبایل</label>
                  <input value={user?.phone || ''} readOnly className="w-full px-2 py-1.5 border rounded-lg text-xs bg-gray-50 text-gray-500" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 mb-0.5 block">🎂 تاریخ تولد</label>
                  <button 
                    type="button"
                    onClick={() => setShowBirthdayPicker(true)}
                    className="w-full px-2 py-1.5 border rounded-lg text-xs text-right bg-white hover:border-pink-300"
                  >
                    📅 {profileForm.birthday || 'انتخاب تاریخ تولد'}
                  </button>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 mb-0.5 block">📧 ایمیل</label>
                  <input 
                    type="email"
                    value={profileForm.email || ''} 
                    onChange={e => {
                      setProfileForm({...profileForm, email: e.target.value});
                      if (profileErrors.email) setProfileErrors({...profileErrors, email: ''});
                    }}
                    onBlur={() => {
                      const email = profileForm.email || '';
                      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                        setProfileErrors({...profileErrors, email: 'ایمیل نامعتبر'});
                      }
                    }}
                    className={`w-full px-2 py-1.5 border rounded-lg text-xs ${profileErrors.email ? 'border-red-400 bg-red-50' : ''}`} 
                  />
                  {profileErrors.email && <p className="text-[9px] text-red-500 mt-0.5">⚠️ {profileErrors.email}</p>}
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 mb-0.5 block">🆔 کد ملی</label>
                  <input 
                    value={profileForm.national_id || ''} 
                    onChange={e => {
                      const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                      setProfileForm({...profileForm, national_id: v});
                      if (profileErrors.national_id) setProfileErrors({...profileErrors, national_id: ''});
                    }}
                    onBlur={() => {
                      const v = profileForm.national_id || '';
                      if (v && v.length !== 10) {
                        setProfileErrors({...profileErrors, national_id: 'کد ملی باید ۱۰ رقم باشد'});
                      } else if (v && /^(\d)\1{9}$/.test(v)) {
                        setProfileErrors({...profileErrors, national_id: 'کد ملی نامعتبر'});
                      } else if (v) {
                        const check = parseInt(v[9]);
                        let sum = 0;
                        for (let i = 0; i < 9; i++) sum += parseInt(v[i]) * (10 - i);
                        const r = sum % 11;
                        const valid = (r < 2 && check === r) || (r >= 2 && check === 11 - r);
                        if (!valid) setProfileErrors({...profileErrors, national_id: 'کد ملی نامعتبر'});
                      }
                    }}
                    className={`w-full px-2 py-1.5 border rounded-lg text-xs ${profileErrors.national_id ? 'border-red-400 bg-red-50' : ''}`} 
                  />
                  {profileErrors.national_id && <p className="text-[9px] text-red-500 mt-0.5">⚠️ {profileErrors.national_id}</p>}
                </div>
              </div>
              
              <hr />
              
              {/* آدرس‌ها */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-gray-700">📍 آدرس‌های من</h4>
                  <button 
                    onClick={() => {
                      setEditingAddress(null);
                      setAddressForm({ title: '', receiver_name: '', receiver_phone: '', province: '', city: '', postal_code: '', full_address: '', is_default: false });
                      setShowAddressForm(true);
                    }}
                    className="text-[10px] bg-pink-500 text-white px-2 py-1 rounded font-bold"
                  >
                    ➕ افزودن
                  </button>
                </div>
                {addresses.length === 0 ? (
                  <p className="text-[10px] text-gray-400 text-center py-3">آدرسی ثبت نشده</p>
                ) : (
                  <div className="space-y-1.5">
                    {addresses.map(a => (
                      <div key={a.id} className="bg-gray-50 rounded-lg p-2 text-[10px]">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-bold">{a.title}</span>
                          {a.is_default && <span className="text-[8px] bg-pink-100 text-pink-600 px-1 rounded">پیش‌فرض</span>}
                        </div>
                        <p className="text-gray-500">{a.province}، {a.city}، {a.full_address}</p>
                        <div className="flex gap-1 mt-1">
                          <button onClick={() => { setEditingAddress(a); setAddressForm(a); setShowAddressForm(true); }} className="text-blue-500 text-[9px]">✏️ ویرایش</button>
                          <button onClick={async () => {
                            if (!confirm('حذف شود؟')) return;
                            await api.delete(`/users/addresses/${a.id}/`);
                            setAddresses(addresses.filter(x => x.id !== a.id));
                          }} className="text-red-500 text-[9px]">🗑️ حذف</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* دکمه‌ها */}
            <div className="p-3 border-t bg-gray-50 flex gap-2">
              <button 
                onClick={async () => {
                  if (profileErrors.email || profileErrors.national_id) {
                    toast.error('لطفاً خطاها را برطرف کنید');
                    return;
                  }
                  setProfileLoading(true);
                  try {
                    const formData = new FormData();
                    // فیلدهای متنی
                    formData.append('first_name', profileForm.first_name || '');
                    formData.append('last_name', profileForm.last_name || '');
                    formData.append('email', profileForm.email || '');
                    formData.append('national_id', profileForm.national_id || '');
                    // آواتار
                    if (avatarFile) {
                      formData.append('avatar', avatarFile);
                    }
                    // ارسال با fetch مستقیم (برای FormData)
                    const token = localStorage.getItem('access_token');
                    const res = await fetch('/api/v1/users/profile/', {
                      method: 'PATCH',
                      headers: { 'Authorization': `Bearer ${token}` },
                      body: formData,
                    });
                    if (!res.ok) {
                      const err = await res.json();
                      throw new Error(err.error || 'خطا');
                    }
                    toast.success('ذخیره شد');
                    if (fetchUser) await fetchUser();
                    setShowProfileModal(false);
                    setAvatarFile(null);
                    setAvatarPreview(null);
                  } catch (e) {
                    console.error(e);
                    toast.error(e?.response?.data?.error || 'خطا در ذخیره');
                  } finally {
                    setProfileLoading(false);
                  }
                }}
                disabled={profileLoading}
                className="flex-1 bg-pink-500 text-white py-2 rounded-lg text-xs font-bold disabled:opacity-50"
              >
                {profileLoading ? '...' : '✓ ذخیره'}
              </button>
              <button onClick={() => setShowProfileModal(false)} className="bg-gray-200 text-gray-600 px-4 py-2 rounded-lg text-xs font-bold">بستن</button>
            </div>
            
          </div>
        </div>
      )}
      
      {/* تقویم تاریخ تولد */}
      {showBirthdayPicker && (
        <div className="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center p-3" onClick={() => setShowBirthdayPicker(false)}>
          <JalaliCalendar
            value={profileForm.birthday || ''}
            onChange={(date) => {
              setProfileForm({...profileForm, birthday: date});
              setShowBirthdayPicker(false);
            }}
            theme="pink"
          />
        </div>
      )}
      
      {/* مودال آدرس */}
      {showAddressForm && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-3" onClick={() => setShowAddressForm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 bg-gradient-to-l from-pink-500 to-pink-600 rounded-t-2xl">
              <h3 className="font-bold text-white text-sm">{editingAddress ? '✏️ ویرایش آدرس' : '➕ آدرس جدید'}</h3>
              <button onClick={() => setShowAddressForm(false)} className="text-white text-lg">✕</button>
            </div>
            <div className="p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input value={addressForm.title || ''} onChange={e => setAddressForm({...addressForm, title: e.target.value})} placeholder="عنوان (خانه، محل کار)" className="px-2 py-1.5 border rounded-lg text-xs" />
                <input value={addressForm.receiver_name || ''} onChange={e => setAddressForm({...addressForm, receiver_name: e.target.value})} placeholder="نام گیرنده" className="px-2 py-1.5 border rounded-lg text-xs" />
                <div>
                  <input 
                    value={addressForm.receiver_phone || ''} 
                    onChange={e => {
                      const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 11);
                      setAddressForm({...addressForm, receiver_phone: v});
                      if (addressErrors.receiver_phone) setAddressErrors({...addressErrors, receiver_phone: ''});
                    }}
                    onBlur={() => {
                      const v = addressForm.receiver_phone || '';
                      if (v && !/^09[0-9]{9}$/.test(v)) {
                        setAddressErrors({...addressErrors, receiver_phone: 'موبایل باید با 09 شروع و ۱۱ رقم باشد'});
                      }
                    }}
                    placeholder="موبایل گیرنده (09...)" 
                    maxLength={11}
                    className={`px-2 py-1.5 border rounded-lg text-xs w-full ${addressErrors.receiver_phone ? 'border-red-400 bg-red-50' : ''}`} 
                  />
                  {addressErrors.receiver_phone && <p className="text-[9px] text-red-500 mt-0.5">⚠️ {addressErrors.receiver_phone}</p>}
                </div>
                <select 
                  value={addressForm.province || ''} 
                  onChange={e => setAddressForm({...addressForm, province: e.target.value, city: ''})}
                  className="px-2 py-1.5 border rounded-lg text-xs bg-white"
                >
                  <option value="">استان...</option>
                  {IRAN_PROVINCES.map(p => (
                    <option key={p.name} value={p.name}>{p.name}</option>
                  ))}
                </select>
                <select 
                  value={addressForm.city || ''} 
                  onChange={e => setAddressForm({...addressForm, city: e.target.value})}
                  disabled={!addressForm.province}
                  className="px-2 py-1.5 border rounded-lg text-xs bg-white disabled:bg-gray-100"
                >
                  <option value="">شهر...</option>
                  {getCitiesForProvince(addressForm.province).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <div>
                  <input 
                    value={addressForm.postal_code || ''} 
                    onChange={e => {
                      const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                      setAddressForm({...addressForm, postal_code: v});
                      if (addressErrors.postal_code) setAddressErrors({...addressErrors, postal_code: ''});
                    }}
                    onBlur={() => {
                      const pc = addressForm.postal_code || '';
                      if (pc && pc.length !== 10) {
                        setAddressErrors({...addressErrors, postal_code: 'کد پستی باید ۱۰ رقم باشد'});
                      } else if (pc && pc.startsWith('0')) {
                        setAddressErrors({...addressErrors, postal_code: 'کد پستی نمی‌تواند با صفر شروع شود'});
                      }
                    }}
                    placeholder="کد پستی (۱۰ رقم)" 
                    maxLength={10}
                    className={`px-2 py-1.5 border rounded-lg text-xs w-full ${addressErrors.postal_code ? 'border-red-400 bg-red-50' : ''}`} 
                  />
                  {addressErrors.postal_code && <p className="text-[9px] text-red-500 mt-0.5">⚠️ {addressErrors.postal_code}</p>}
                </div>
              </div>
              <textarea value={addressForm.full_address || ''} onChange={e => setAddressForm({...addressForm, full_address: e.target.value})} placeholder="آدرس کامل" rows={2} className="w-full px-2 py-1.5 border rounded-lg text-xs resize-none" />
              <label className="flex items-center gap-2 text-[10px] text-gray-600">
                <input type="checkbox" checked={addressForm.is_default || false} onChange={e => setAddressForm({...addressForm, is_default: e.target.checked})} />
                آدرس پیش‌فرض
              </label>
            </div>
            <div className="p-3 border-t bg-gray-50 flex gap-2 rounded-b-2xl">
              <button 
                onClick={async () => {
                  try {
                    // ═══ اعتبارسنجی ═══
                    const errors = {};
                    if (!addressForm.title) errors.title = 'عنوان الزامی';
                    if (!addressForm.full_address) errors.full_address = 'آدرس الزامی';
                    if (addressForm.receiver_phone && !/^09[0-9]{9}$/.test(addressForm.receiver_phone)) {
                      errors.receiver_phone = 'موبایل نامعتبر';
                    }
                    if (addressForm.postal_code && addressForm.postal_code.length !== 10) {
                      errors.postal_code = 'کد پستی ۱۰ رقم';
                    }
                    
                    if (Object.keys(errors).length > 0) {
                      setAddressErrors(errors);
                      toast.error(Object.values(errors)[0]);
                      return;
                    }
                    if (editingAddress) {
                      const res = await api.patch(`/users/addresses/${editingAddress.id}/`, addressForm);
                      setAddresses(addresses.map(x => x.id === editingAddress.id ? res.data : x));
                    } else {
                      const res = await api.post('/users/addresses/', addressForm);
                      setAddresses([...addresses, res.data]);
                    }
                    toast.success('ذخیره شد');
                    setShowAddressForm(false);
                  } catch (e) { toast.error('خطا'); }
                }}
                className="flex-1 bg-pink-500 text-white py-2 rounded-lg text-xs font-bold"
              >
                ✓ ذخیره
              </button>
              <button onClick={() => setShowAddressForm(false)} className="bg-gray-200 text-gray-600 px-4 py-2 rounded-lg text-xs font-bold">انصراف</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
