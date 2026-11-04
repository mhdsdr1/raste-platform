import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronLeft, Search } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';

export default function ControlCenterPage() {
  const { user } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedUsers, setExpandedUsers] = useState({});
  const [expandedShops, setExpandedShops] = useState({});

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
  
  // وقتی جستجو فعاله، همه رو باز کن؛ وقتی خالی شد، همه رو ببند
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
  }, [users, search]);

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
  
  const toggleUser = (id) => {
    setExpandedUsers(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleShop = (id) => {
    setExpandedShops(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="min-h-screen bg-[#fdf2f8] pb-8">
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-3 py-3 flex items-center gap-2">
          <Link to="/dashboard" className="text-xs text-gray-500 hover:text-pink-600">← داشبورد</Link>
          <h1 className="text-lg font-extrabold text-gray-800 flex-1">🛡️ مرکز کنترل</h1>
        </div>
      </header>

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
                  <input type="checkbox" onClick={e => e.stopPropagation()} className="cursor-pointer" />
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
                          <input type="checkbox" onClick={e => e.stopPropagation()} className="cursor-pointer" />
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
                                <input type="checkbox" className="cursor-pointer" />
                                <p className="text-[10px] text-gray-600 flex-1">
                                  📦 {highlight(p.title, search)}
                                  <span className={`mr-1 text-[8px] px-1 rounded ${
                                    p.approval_status === 'approved' ? 'bg-green-100 text-green-600' :
                                    p.approval_status === 'rejected' ? 'bg-red-100 text-red-600' :
                                    'bg-yellow-100 text-yellow-600'
                                  }`}>
                                    {p.approval_status === 'approved' ? 'تایید' : 
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
    </div>
  );
}
