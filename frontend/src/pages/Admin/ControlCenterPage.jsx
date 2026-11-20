import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronLeft, Search } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../services/api';
import JalaliCalendar, { shamsiToGregorian } from '../../components/JalaliCalendar';
import useAuthStore from '../../store/authStore';

export default function ControlCenterPage() {
  const { user } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedUsers, setExpandedUsers] = useState({});
  const [expandedShops, setExpandedShops] = useState({});
  const [selectedItems, setSelectedItems] = useState([]); // [{type, id, name, parentUserId?, parentShopId?}]
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState(null);
  const [actionReason, setActionReason] = useState('');
  const [actionBanDate, setActionBanDate] = useState('');
  const [showBanCalendar, setShowBanCalendar] = useState(false);
  const [actionBanTime, setActionBanTime] = useState('23:59');
  const [historyLogs, setHistoryLogs] = useState([]);
  const [historyUserScore, setHistoryUserScore] = useState(null);
  const [showPositiveModal, setShowPositiveModal] = useState(false);
  const [positiveForm, setPositiveForm] = useState({
    action_type: 'invite_signup',
    count: 1,
    custom_score: 0,
    reason: '',
  });
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchTree = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      const res = await api.get(`/shops/admin/tree/?${params.toString()}`);
      setUsers(res.data.users || []);
    } catch (e) {
      console.error(e);
      toast.error('خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTree(); }, [search]);
  
  // وقتی مودال سابقه باز شد، خودکار fetch کن
  useEffect(() => {
    if (showActionModal && actionType === 'history' && selectedItems.length > 0) {
      fetchHistory();
    }
  }, [showActionModal, actionType, selectedItems]);
  
  // فقط وقتی search عوض شد، ریست کن
  useEffect(() => {
    if (search) {
      const allUsers = {};
      const allShops = {};
      users.forEach(u => {
        allUsers[u.id] = true;
        u.shops?.forEach(s => { allShops[s.id] = true; });
      });
      setExpandedUsers(allUsers);
      setExpandedShops(allShops);
    } else {
      setExpandedUsers({});
      setExpandedShops({});
    }
  }, [search]);

  if (!user?.can_access_control) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdf2f8]">
        <div className="text-center">
          <p className="text-red-500 font-bold">دسترسی ندارید</p>
          <Link to="/dashboard" className="text-sm text-pink-600 mt-2 block">← بازگشت</Link>
        </div>
      </div>
    );
  }

  const highlight = (text, query) => {
    if (!query || !text) return text;
    const parts = String(text).split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() 
        ? <mark key={i} className="bg-pink-200 text-pink-900 rounded px-0.5">{part}</mark> 
        : part
    );
  };
  
  const isMatch = (text, query) => {
    if (!query || !text) return false;
    return String(text).toLowerCase().includes(query.toLowerCase());
  };
  
  const isSelected = (type, id) => selectedItems.some(x => x.type === type && x.id === id);
  
  const toggleSelect = (item) => {
    console.log('toggleSelect called with:', item);
    setSelectedItems(prev => {
      const exists = prev.find(x => x.type === item.type && x.id === item.id);
      if (exists) return prev.filter(x => !(x.type === item.type && x.id === item.id));
      return [...prev, item];
    });
  };
  
  const clearSelection = () => setSelectedItems([]);
  
  const fetchHistory = async () => {
    if (selectedItems.length === 0) return;
    setHistoryLoading(true);
    try {
      const allLogs = [];
      for (const item of selectedItems) {
        try {
          // اگه کاربر انتخاب شده، از affected_user_id استفاده کن
          // (که همه عملیات‌های روی محصولات/فروشگاه‌های کاربر رو هم برمی‌گردونه)
          let url;
          if (item.type === 'user') {
            url = `/shops/admin/logs/?affected_user_id=${item.id}`;
          } else {
            url = `/shops/admin/logs/?target_type=${item.type}&target_id=${item.id}`;
          }
          const res = await api.get(url);
          const logs = (res.data.logs || []).map(log => ({
            ...log,
            _item_name: item.name,
            _item_type: item.type,
          }));
          allLogs.push(...logs);
          // ذخیره امتیاز کاربر
          if (res.data.user_score !== null && res.data.user_score !== undefined) {
            setHistoryUserScore(res.data.user_score);
          }
        } catch (e) {
          console.error('Error fetching history for', item, e);
        }
      }
      allLogs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setHistoryLogs(allLogs);
    } catch (e) {
      toast.error(e?.response?.data?.error || 'خطا در بارگذاری سابقه');
      setHistoryLogs([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // افکت درخشش طلایی از وسط
  const goldShineStyle = `
    @keyframes starGlow {
      0%   { opacity: 0.6; filter: drop-shadow(0 0 1px #fff); }
      50%  { opacity: 1; filter: drop-shadow(0 0 4px #fff) drop-shadow(0 0 6px #fef08a); }
      100% { opacity: 0.6; filter: drop-shadow(0 0 1px #fff); }
    }
    .star-spin {
      display: inline-block;
      animation: starGlow 2s ease-in-out infinite;
    }
    @keyframes goldShine {
      0%   { opacity: 0; transform: scale(0.3); }
      20%  { opacity: 1; transform: scale(1.5); }
      35%  { opacity: 0.8; transform: scale(1.2); }
      50%  { opacity: 1; transform: scale(1.4); }
      70%  { opacity: 0; transform: scale(0.6); }
      100% { opacity: 0; transform: scale(0.3); }
    }
    .shine-gold {
      position: relative;
      overflow: hidden;
    }
    .shine-gold::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: radial-gradient(
        circle at center,
        rgba(255,255,255,0.9) 0%,
        rgba(255,255,255,0.4) 20%,
        rgba(255,255,255,0) 50%
      );
      animation: goldShine 3s ease-in-out infinite;
      animation-delay: 1s;
      pointer-events: none;
    }
  `;

  const getScoreColor = (score) => {
    if (score === null || score === undefined) return 'bg-blue-500';
    if (score >= 0) return 'bg-green-500 shine-gold';  // سبز با درخشش برای مثبت
    if (score >= 0) return 'bg-green-500';
    if (score > -10) return 'bg-yellow-500';
    if (score > -20) return 'bg-orange-500';
    return 'bg-red-600';
  };

  const isBanDateValid = () => {
    if (actionType !== 'ban') return true;
    if (!actionBanDate) return true; // بدون تاریخ = بن دائمی
    try {
      const gregorian = shamsiToGregorian(actionBanDate);
      const dt = new Date(`${gregorian}T${actionBanTime || '23:59'}:00`);
      return dt.getTime() > Date.now();
    } catch (e) {
      return false;
    }
  };
  
  // تشخیص نوع انتخاب‌شده‌ها
  const getSelectionTypes = () => {
    const types = new Set(selectedItems.map(x => x.type));
    if (types.size === 0) return null;
    if (types.size === 1) return types.values().next().value; // 'user' | 'shop' | 'product'
    return 'mixed'; // ترکیبی
  };
  
  const selectionType = getSelectionTypes();
  
  const toggleUser = (id) => {
    setExpandedUsers(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleShop = (id) => {
    setExpandedShops(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="min-h-screen bg-[#fdf2f8] pb-8">
      <style>{goldShineStyle}</style>
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-3 py-3 flex items-center gap-2">
          <Link to="/dashboard" className="text-xs text-gray-500 hover:text-pink-600">← داشبورد</Link>
          <h1 className="text-lg font-extrabold text-gray-800 flex-1">🛡️ مرکز کنترل</h1>
        </div>
      </header>

      {/* نوار ابزار عملیات */}
      {selectedItems.length > 0 && (
        <div className="bg-gradient-to-l from-rose-400 to-rose-500 text-white shadow-md sticky top-[57px] z-20">
          <div className="max-w-6xl mx-auto px-3 py-2 flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold">
              {selectedItems.length} مورد
            </span>
            
            {/* محصول */}
            {selectionType === 'product' && (
              <>
                <button onClick={() => { setActionType('soft_delete'); setShowActionModal(true); }}
                  className="text-[10px] bg-white/20 hover:bg-white/30 px-2 py-1 rounded font-bold">
                  👁️ پنهان
                </button>
                <button onClick={() => { setActionType('hard_delete'); setShowActionModal(true); }}
                  className="text-[10px] bg-white/20 hover:bg-white/30 px-2 py-1 rounded font-bold">
                  🗑️ حذف
                </button>
                <button onClick={() => { setActionType('restore'); setShowActionModal(true); }}
                  className="text-[10px] bg-white/20 hover:bg-white/30 px-2 py-1 rounded font-bold">
                  ♻️ بازگردانی
                </button>
              </>
            )}
            
            {/* فروشگاه */}
            {selectionType === 'shop' && (
              <>
                <button onClick={() => { setActionType('soft_delete'); setShowActionModal(true); }}
                  className="text-[10px] bg-white/20 hover:bg-white/30 px-2 py-1 rounded font-bold">
                  👁️ پنهان
                </button>
                <button onClick={() => { setActionType('restore'); setShowActionModal(true); }}
                  className="text-[10px] bg-white/20 hover:bg-white/30 px-2 py-1 rounded font-bold">
                  ♻️ بازگردانی
                </button>
              </>
            )}
            
            {/* کاربر */}
            {selectionType === 'user' && (
              <>
                <button onClick={() => { setActionType('warning'); setShowActionModal(true); }}
                  className="text-[10px] bg-white/20 hover:bg-white/30 px-2 py-1 rounded font-bold">
                  ⚠️ هشدار
                </button>
                <button onClick={() => { setActionType('ban'); setShowActionModal(true); }}
                  className="text-[10px] bg-white/20 hover:bg-white/30 px-2 py-1 rounded font-bold">
                  ⛔ بن تا تاریخ
                </button>
                <button onClick={() => { setShowPositiveModal(true); }}
                  className="text-[10px] bg-amber-500/40 hover:bg-amber-500/60 px-2 py-1 rounded font-bold">
                  ➕ امتیاز جبرانی
                </button>
                <button onClick={() => { setActionType('restore'); setShowActionModal(true); }}
                  className="text-[10px] bg-white/20 hover:bg-white/30 px-2 py-1 rounded font-bold">
                  ♻️ رفع مسدودی
                </button>
                <button onClick={() => { setActionType('history'); setShowActionModal(true); }}
                  className="text-[10px] bg-white/20 hover:bg-white/30 px-2 py-1 rounded font-bold">
                  📋 سابقه
                </button>
              </>
            )}
            
            {selectionType === 'mixed' && (
              <span className="text-[10px] text-white/80">(فقط یک نوع را انتخاب کنید)</span>
            )}
            
            <button onClick={clearSelection}
              className="text-[10px] bg-white/10 hover:bg-white/20 px-2 py-1 rounded mr-auto">
              ✕ لغو
            </button>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-3 py-4">
        {/* جستجو */}
        <div className="relative mb-3">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="جستجو: نام، موبایل، کد ملی..."
            className="w-full pr-9 pl-3 py-2 border rounded-lg text-xs"
          />
        </div>

        {loading ? (
          <div className="text-center py-10 text-gray-400 text-xs">در حال بارگذاری...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-xs bg-white rounded-2xl border">
            کاربری یافت نشد
          </div>
        ) : (
          <div className="space-y-1">
            {users.map(u => (
              <div key={u.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
                {/* ردیف کاربر */}
                <div
                  className="flex items-center gap-2 p-2.5 hover:bg-gray-50 cursor-pointer"
                  onClick={() => toggleUser(u.id)}
                >
                  {expandedUsers[u.id] ? <ChevronDown size={14} /> : <ChevronLeft size={14} />}
                  <input 
                    type="checkbox" 
                    checked={isSelected('user', u.id)}
                    onChange={() => toggleSelect({type: 'user', id: u.id, name: u.full_name || u.phone})}
                    onClick={e => e.stopPropagation()} 
                    className="cursor-pointer" 
                  />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-gray-800">
                      {highlight(u.full_name || u.phone, search)}
                      <span className="text-[10px] text-gray-400 mr-2">{highlight(u.phone, search)}</span>
                      {u.role === 'owner' && <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded mr-1">مدیر</span>}
                      {u.role === 'admin' && <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded mr-1">ادمین</span>}
                      {u.is_blocked && <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded">مسدود</span>}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {u.shops_count} فروشگاه | {u.total_products} محصول
                    </p>
                  </div>
                </div>

                {/* فروشگاه‌ها */}
                {expandedUsers[u.id] && u.shops?.length > 0 && (
                  <div className="border-t bg-gray-50 pr-6">
                    {u.shops.map(s => (
                      <div key={s.id} className="border-b last:border-b-0">
                        {/* ردیف فروشگاه */}
                        <div
                          className="flex items-center gap-2 p-2 hover:bg-gray-100 cursor-pointer"
                          onClick={() => toggleShop(s.id)}
                        >
                          {expandedShops[s.id] ? <ChevronDown size={12} /> : <ChevronLeft size={12} />}
                          <input 
                            type="checkbox" 
                            checked={isSelected('shop', s.id)}
                            onChange={() => toggleSelect({type: 'shop', id: s.id, name: s.name, parentUserId: u.id})}
                            onClick={e => e.stopPropagation()} 
                            className="cursor-pointer" 
                          />
                          <div className="flex-1">
                            <p className="text-[11px] font-bold text-gray-700">
                              🏪 {highlight(s.name, search)}
                              {!s.is_active && <span className="text-[9px] bg-red-100 text-red-600 px-1 rounded mr-1">غیرفعال</span>}
                            </p>
                            <p className="text-[9px] text-gray-400">{s.products_count} محصول</p>
                          </div>
                        </div>

                        {/* محصولات */}
                        {expandedShops[s.id] && s.products?.length > 0 && (
                          <div className="pr-6 pb-1">
                            {s.products.map(p => (
                              <div key={p.id} className="flex items-center gap-2 p-1.5 hover:bg-white rounded">
                                <input 
                                  type="checkbox" 
                                  checked={isSelected('product', p.id)}
                                  onChange={() => toggleSelect({type: 'product', id: p.id, name: p.title, parentUserId: u.id, parentShopId: s.id})}
                                  className="cursor-pointer" 
                                />
                                <p className="text-[10px] text-gray-600 flex-1">
                                  📦 {highlight(p.title, search)}
                                  <span className={`mr-1 text-[8px] px-1 rounded ${
                                    p.is_deleted ? 'bg-gray-200 text-gray-600' :
                                    p.approval_status === 'approved' ? 'bg-green-100 text-green-600' :
                                    p.approval_status === 'rejected' ? 'bg-red-100 text-red-600' :
                                    'bg-yellow-100 text-yellow-600'
                                  }`}>
                                    {p.is_deleted ? 'پنهان' :
                                     p.approval_status === 'approved' ? 'تایید' : 
                                     p.approval_status === 'rejected' ? 'رد' : 'بررسی'}
                                  </span>
                                </p>
                                <span className="text-[9px] text-gray-400">{Number(p.price).toLocaleString('fa-IR')}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* مودال عملیات */}
      {/* مودال امتیاز جبرانی */}
      {showPositiveModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3" onClick={() => setShowPositiveModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 rounded-t-2xl bg-gradient-to-l from-amber-500 to-amber-600">
              <h3 className="font-bold text-white text-sm">
                ➕ امتیاز جبرانی
              </h3>
              <button onClick={() => setShowPositiveModal(false)} className="text-white text-lg">✕</button>
            </div>

            <div className="p-3 space-y-3 overflow-y-auto flex-1">
              {/* نام کاربر */}
              <div className="bg-amber-50 rounded-lg p-2 text-[11px] text-gray-700">
                👤 {selectedItems[0]?.name}
              </div>

              {/* گزینه‌ها */}
              <div>
                <label className="text-[10px] text-gray-500 mb-1 block">نوع امتیاز</label>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="positive_action"
                      checked={positiveForm.action_type === 'invite_signup'}
                      onChange={() => setPositiveForm({...positiveForm, action_type: 'invite_signup', count: 1})}
                    />
                    <span className="text-xs font-bold text-gray-700">🎁 ثبت‌نام با کد معرف</span>
                    <span className="text-[10px] text-green-600 mr-auto">+1 هر نفر</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="positive_action"
                      checked={positiveForm.action_type === 'invite_purchase'}
                      onChange={() => setPositiveForm({...positiveForm, action_type: 'invite_purchase', count: 1})}
                    />
                    <span className="text-xs font-bold text-gray-700">💳 خرید پلن با کد معرف</span>
                    <span className="text-[10px] text-green-600 mr-auto">+5 هر نفر</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="positive_action"
                      checked={positiveForm.action_type === 'report_help'}
                      onChange={() => setPositiveForm({...positiveForm, action_type: 'report_help', count: 1})}
                    />
                    <span className="text-xs font-bold text-gray-700">🚨 گزارش تخلف مفید</span>
                    <span className="text-[10px] text-green-600 mr-auto">+1 هر مورد</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="positive_action"
                      checked={positiveForm.action_type === 'custom_positive' || positiveForm.action_type === 'custom_negative'}
                      onChange={() => setPositiveForm({...positiveForm, action_type: 'custom_positive', custom_score: 5})}
                    />
                    <span className="text-xs font-bold text-gray-700">✏️ تشویق/تنبیه مدیر</span>
                  </label>
                </div>
              </div>

              {/* تعداد (برای سه گزینه اول) */}
              {(positiveForm.action_type === 'invite_signup' || positiveForm.action_type === 'invite_purchase' || positiveForm.action_type === 'report_help') && (
                <div>
                  <label className="text-[10px] text-gray-500 mb-1 block">تعداد</label>
                  <input
                    type="number"
                    min="1"
                    value={positiveForm.count}
                    onChange={e => setPositiveForm({...positiveForm, count: parseInt(e.target.value) || 1})}
                    className="w-full px-2 py-1.5 border rounded-lg text-xs"
                  />
                  <p className="text-[10px] text-amber-600 mt-1 font-bold">
                    امتیاز: {positiveForm.action_type === 'invite_purchase' ? positiveForm.count * 5 : positiveForm.count} +
                  </p>
                </div>
              )}

              {/* امتیاز دلخواه (برای custom) */}
              {(positiveForm.action_type === 'custom_positive' || positiveForm.action_type === 'custom_negative') && (
                <div>
                  <label className="text-[10px] text-gray-500 mb-1 block">مقدار امتیاز (مثبت یا منفی)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={positiveForm.custom_score}
                      onChange={e => {
                        const val = parseInt(e.target.value) || 0;
                        setPositiveForm({
                          ...positiveForm,
                          custom_score: val,
                          action_type: val >= 0 ? 'custom_positive' : 'custom_negative',
                        });
                      }}
                      className="flex-1 px-2 py-1.5 border rounded-lg text-xs"
                      placeholder="مثلاً 10 یا -5"
                    />
                  </div>
                  <p className={`text-[10px] mt-1 font-bold ${positiveForm.custom_score >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {positiveForm.custom_score >= 0 ? '🎉 تشویق' : '⚠️ تنبیه'}: {positiveForm.custom_score >= 0 ? '+' : ''}{positiveForm.custom_score}
                  </p>
                </div>
              )}

              {/* دلیل */}
              <div>
                <label className="text-[10px] text-gray-500 mb-1 block">توضیح (اختیاری)</label>
                <textarea
                  value={positiveForm.reason}
                  onChange={e => setPositiveForm({...positiveForm, reason: e.target.value})}
                  rows={2}
                  className="w-full px-2 py-1.5 border rounded-lg text-xs resize-none"
                  placeholder="مثلاً: ۳ نفر با کد این کاربر ثبت‌نام کردن"
                />
              </div>
            </div>

            <div className="p-3 border-t bg-gray-50 flex gap-2 rounded-b-2xl">
              <button
                onClick={async () => {
                  try {
                    const res = await api.post('/shops/admin/positive-score/', {
                      user_id: selectedItems[0]?.id,
                      action_type: positiveForm.action_type,
                      count: positiveForm.count,
                      custom_score: positiveForm.custom_score,
                      reason: positiveForm.reason,
                    });
                    toast.success(res.data.message + ` (امتیاز جدید: ${res.data.new_score})`);
                    setShowPositiveModal(false);
                    setPositiveForm({ action_type: 'invite_signup', count: 1, custom_score: 0, reason: '' });
                    setSelectedItems([]);
                    fetchTree();
                  } catch (e) {
                    toast.error(e?.response?.data?.error || 'خطا');
                  }
                }}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-lg text-xs font-bold"
              >
                ✓ اعمال
              </button>
              <button onClick={() => setShowPositiveModal(false)} className="bg-gray-200 text-gray-600 px-4 py-2 rounded-lg text-xs font-bold">انصراف</button>
            </div>
          </div>
        </div>
      )}

      {showActionModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3" onClick={() => setShowActionModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className={`flex items-center justify-between px-4 py-4 rounded-t-2xl ${
              actionType === 'soft_delete' ? 'bg-orange-500' :
              actionType === 'hard_delete' ? 'bg-red-600' :
              actionType === 'ban' ? 'bg-red-700' :
              actionType === 'warning' ? 'bg-yellow-500' :
              actionType === 'history' ? getScoreColor(historyUserScore) :
              'bg-green-500'
            }`}>
              <h3 className="font-bold text-white text-sm">
                {actionType === 'soft_delete' && '👁️ پنهان کردن'}
                {actionType === 'hard_delete' && '🗑️ حذف کامل'}
                {actionType === 'ban' && '⛔ بن کردن'}
                {actionType === 'warning' && '⚠️ ارسال هشدار'}
                {actionType === 'restore' && '♻️ بازگردانی'}
                {actionType === 'history' && '📊 امتیازات'}
                {actionType !== 'history' && ` (${selectedItems.length} مورد)`}
              </h3>
              <div className="flex items-center gap-2">
                {actionType === 'history' && historyUserScore !== null && (
                  <span className="text-base font-extrabold text-white flex items-center gap-1" dir="ltr">
                    {historyUserScore >= 20 && <span className="text-lg star-spin">✨</span>}
                    {historyUserScore < 0 ? '-' : ''}{Math.abs(historyUserScore)}
                  </span>
                )}
                <button onClick={() => setShowActionModal(false)} className="text-white text-lg">✕</button>
              </div>
            </div>

            <div className="p-3 space-y-3 overflow-y-auto flex-1">
              {/* لیست آیتم‌ها (غیر از history) */}
              {actionType !== 'history' && (
                <div className="bg-gray-50 rounded-lg p-2 max-h-32 overflow-y-auto">
                  {selectedItems.map((item, i) => (
                    <p key={i} className="text-[10px] text-gray-600">
                      {item.type === 'user' && '👤'}
                      {item.type === 'shop' && '🏪'}
                      {item.type === 'product' && '📦'}
                      {' '}{item.name}
                    </p>
                  ))}
                </div>
              )}

              {/* نمایش لیست سابقه‌ها (برای history) */}
              {actionType === 'history' && (
                <div>
                  {historyLoading ? (
                    <div className="text-center py-8 text-gray-400 text-xs">در حال بارگذاری...</div>
                  ) : historyLogs.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-xs">سابقه‌ای یافت نشد</div>
                  ) : (
                    <div className="space-y-2">
                      {historyLogs.map((log) => (
                        <div key={log.id} className="border rounded-lg p-2 bg-gray-50">
                          <div className="flex items-start justify-between mb-1">
                            <span className="text-[11px] font-bold text-gray-800">
                              {log.action_display}
                              {log.score_delta !== 0 && (
                                <span className={`mr-1 text-[9px] px-1 py-0.5 rounded ${
                                  log.score_delta < 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                                }`}>
                                  {log.score_delta > 0 ? '+' : ''}{log.score_delta}
                                </span>
                              )}
                            </span>
                            <span className="text-[9px] text-gray-400">
                              {new Date(log.created_at).toLocaleString('fa-IR', { calendar: 'persian' })}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-600 mb-1">
                            {log.target_type_display}: {log.target_name}
                          </p>
                          {log.reason && (
                            <p className="text-[10px] text-gray-500 bg-white rounded p-1 mt-1">
                              💬 {log.reason}
                            </p>
                          )}
                          <p className="text-[9px] text-gray-400 mt-1">
                            👤 {log.admin_name || log.admin_phone}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* دلیل */}
              {(actionType === 'soft_delete' || actionType === 'hard_delete' || actionType === 'ban' || actionType === 'warning') && (
                <div>
                  <label className="text-[10px] text-gray-500 mb-1 block">
                    {actionType === 'warning' ? 'متن هشدار' : 'دلیل'} (اختیاری)
                  </label>
                  <textarea
                    value={actionReason}
                    onChange={e => setActionReason(e.target.value)}
                    rows={2}
                    className="w-full px-2 py-1.5 border rounded-lg text-xs resize-none"
                    placeholder={actionType === 'warning' ? 'مثلاً: این محصول غیرمجاز است...' : 'دلیل...'}
                  />
                </div>
              )}

              {/* تاریخ بن */}
              {actionType === 'ban' && (
                <div>
                  <label className="text-[10px] text-gray-500 mb-1 block">بن تا تاریخ (اختیاری)</label>
                  
                  {/* دکمه تاریخ + تقویم بالای اون */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowBanCalendar(v => !v)}
                      className="w-full px-2 py-1.5 border rounded-lg text-xs text-right bg-white hover:bg-gray-50 flex items-center justify-between"
                    >
                      <span className={actionBanDate ? 'text-gray-800' : 'text-gray-400'}>
                        {actionBanDate || 'انتخاب تاریخ'}
                      </span>
                      <span className="text-gray-400">📅</span>
                    </button>
                    {showBanCalendar && (
                      <div className="absolute z-50 bottom-full mb-1 left-0 shadow-2xl">
                        <JalaliCalendar
                          value={actionBanDate}
                          onChange={(v) => { setActionBanDate(v); setShowBanCalendar(false); }}
                          theme="fuchsia"
                        />
                      </div>
                    )}
                  </div>

                  {/* زمان‌سنج سفارشی */}
                  <div className="mt-2">
                    <label className="text-[10px] text-gray-500 mb-1 block">ساعت (به وقت ایران)</label>
                    <div className="flex items-center gap-1" dir="ltr">
                      {/* ساعت */}
                      <div className="flex items-center border rounded-lg overflow-hidden bg-white">
                        <button
                          type="button"
                          onClick={() => {
                            const [h, m] = actionBanTime.split(':').map(Number);
                            const newH = (h + 1) % 24;
                            setActionBanTime(`${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
                          }}
                          className="w-6 h-8 text-gray-500 hover:bg-gray-100 text-xs font-bold"
                        >▲</button>
                        <input
                          type="number"
                          min="0"
                          max="23"
                          value={actionBanTime.split(':')[0] || '00'}
                          onChange={e => {
                            let v = parseInt(e.target.value) || 0;
                            if (v < 0) v = 0;
                            if (v > 23) v = 23;
                            const m = actionBanTime.split(':')[1] || '00';
                            setActionBanTime(`${String(v).padStart(2, '0')}:${m}`);
                          }}
                          className="w-10 text-center text-sm font-bold border-0 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const [h, m] = actionBanTime.split(':').map(Number);
                            const newH = (h - 1 + 24) % 24;
                            setActionBanTime(`${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
                          }}
                          className="w-6 h-8 text-gray-500 hover:bg-gray-100 text-xs font-bold"
                        >▼</button>
                      </div>

                      <span className="text-lg font-bold text-gray-400">:</span>

                      {/* دقیقه */}
                      <div className="flex items-center border rounded-lg overflow-hidden bg-white">
                        <button
                          type="button"
                          onClick={() => {
                            const [h, m] = actionBanTime.split(':').map(Number);
                            const newM = (m + 5) % 60;
                            setActionBanTime(`${String(h).padStart(2, '0')}:${String(newM).padStart(2, '0')}`);
                          }}
                          className="w-6 h-8 text-gray-500 hover:bg-gray-100 text-xs font-bold"
                        >▲</button>
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={actionBanTime.split(':')[1] || '00'}
                          onChange={e => {
                            let v = parseInt(e.target.value) || 0;
                            if (v < 0) v = 0;
                            if (v > 59) v = 59;
                            const h = actionBanTime.split(':')[0] || '00';
                            setActionBanTime(`${h}:${String(v).padStart(2, '0')}`);
                          }}
                          className="w-10 text-center text-sm font-bold border-0 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const [h, m] = actionBanTime.split(':').map(Number);
                            const newM = (m - 5 + 60) % 60;
                            setActionBanTime(`${String(h).padStart(2, '0')}:${String(newM).padStart(2, '0')}`);
                          }}
                          className="w-6 h-8 text-gray-500 hover:bg-gray-100 text-xs font-bold"
                        >▼</button>
                      </div>

                      {/* دکمه‌های میانبر */}
                      <div className="flex gap-1 mr-1">
                        <button
                          type="button"
                          onClick={() => setActionBanTime('23:59')}
                          className="text-[9px] bg-gray-100 hover:bg-pink-100 text-gray-600 hover:text-pink-600 px-1.5 py-1 rounded"
                        >پایان روز</button>
                        <button
                          type="button"
                          onClick={() => setActionBanTime('12:00')}
                          className="text-[9px] bg-gray-100 hover:bg-pink-100 text-gray-600 hover:text-pink-600 px-1.5 py-1 rounded"
                        >ظهر</button>
                      </div>
                    </div>
                  </div>

                  {!isBanDateValid() && (
                    <p className="text-[10px] text-red-600 mt-2 font-bold">
                      ⚠️ تاریخ/ساعت انتخاب‌شده باید بعد از الان باشد
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="p-3 border-t bg-gray-50 flex gap-2 rounded-b-2xl">
              {actionType !== 'history' && (
              <button
                onClick={async () => {
                  try {
                    const res = await api.post('/shops/admin/bulk-action/', {
                      action: actionType,
                      items: selectedItems,
                      reason: actionReason,
                      banned_until: actionBanDate ? `${shamsiToGregorian(actionBanDate)}T${actionBanTime}` : '',
                    });
                    toast.success(`${res.data.success_count} مورد اعمال شد`);
                    setShowActionModal(false);
                    setSelectedItems([]);
                    setActionReason('');
                    setActionBanDate('');
                    setShowBanCalendar(false);
                    setActionBanTime('23:59');
                    fetchTree();
                  } catch (e) {
                    toast.error(e?.response?.data?.error || 'خطا');
                  }
                }}
                disabled={!isBanDateValid()}
                className={`flex-1 text-white py-2 rounded-lg text-xs font-bold ${
                  isBanDateValid() ? 'bg-pink-500 hover:bg-pink-600' : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                ✓ اعمال
              </button>
              )}
              <button onClick={() => { setShowActionModal(false); setHistoryLogs([]); setHistoryUserScore(null); }} className={`${actionType === 'history' ? 'flex-1' : ''} bg-gray-200 text-gray-600 px-4 py-2 rounded-lg text-xs font-bold`}>
                {actionType === 'history' ? 'بستن' : 'انصراف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
