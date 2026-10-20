import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../../services/api';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users/notifications/');
      setNotifications(res.data.notifications || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchNotifications(); }, []);

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'alert') return n.notif_type === 'alert';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markRead = async (notif) => {
    if (notif.is_read) return;
    try {
      await api.patch(`/users/notifications/${notif.id}/read/`);
      setNotifications(prev => prev.map(x => x.id === notif.id ? {...x, is_read: true} : x));
    } catch (e) {}
  };

  const markAllRead = async () => {
    try {
      await api.patch('/users/notifications/read-all/');
      setNotifications(prev => prev.map(x => ({...x, is_read: true})));
      toast.success('همه خوانده شدند');
    } catch (e) { toast.error('خطا'); }
  };

  const deleteNotif = async (id) => {
    if (!confirm('حذف شود؟')) return;
    try {
      await api.delete(`/users/notifications/${id}/`);
      setNotifications(prev => prev.filter(x => x.id !== id));
      toast.success('حذف شد');
    } catch (e) { toast.error('خطا'); }
  };

  const handleClick = (notif) => {
    markRead(notif);
    if (notif.link) navigate(notif.link);
  };

  return (
    <div className="min-h-screen bg-[#fdf2f8] pb-8">
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-3 py-3 flex items-center gap-2">
          <Link to="/dashboard" className="text-xs text-gray-500 hover:text-pink-600">← داشبورد</Link>
          <h1 className="text-lg font-extrabold text-gray-800 flex-1">
            🔔 نوتیفیکیشن‌ها
            {unreadCount > 0 && (
              <span className="mr-2 text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">{unreadCount}</span>
            )}
          </h1>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-[10px] bg-pink-500 text-white px-3 py-1.5 rounded-lg font-bold">
              ✅ خواندن همه
            </button>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-3 py-4">
        <div className="flex gap-1 mb-3">
          {[
            { id: 'all', label: 'همه' },
            { id: 'unread', label: '🔵 نخوانده' },
            { id: 'alert', label: '⚠️ هشدارها' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              className={`text-[11px] px-3 py-1.5 rounded-lg transition-all ${
                filter === t.id ? 'bg-pink-500 text-white font-bold' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-400 text-xs">در حال بارگذاری...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-xs bg-white rounded-2xl border">
            <span className="text-3xl block mb-2">🔔</span>
            نوتیفیکیشنی یافت نشد
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(n => (
              <div
                key={n.id}
                className={`bg-white rounded-xl border shadow-sm p-3 hover:shadow-md transition-all ${
                  n.notif_type === 'alert' ? 'border-red-200' : 'border-gray-100'
                } ${!n.is_read ? 'border-r-4' : ''} ${
                  !n.is_read && n.notif_type === 'alert' ? 'border-r-red-500' : 
                  !n.is_read ? 'border-r-pink-500' : ''
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-xl">{n.icon || '🔔'}</span>
                  <div className="flex-1 min-w-0" onClick={() => handleClick(n)} style={{ cursor: n.link ? 'pointer' : 'default' }}>
                    <p className={`text-xs font-bold ${
                      n.notif_type === 'alert' ? 'text-red-700' : 'text-gray-800'
                    }`}>
                      {n.title}
                    </p>
                    <p className="text-[11px] text-gray-600 mt-1">{n.message}</p>
                    <p className="text-[9px] text-gray-400 mt-1">{n.created_at_shamsi}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    {!n.is_read && (
                      <button
                        onClick={() => markRead(n)}
                        className="text-green-500 hover:bg-green-50 p-1 rounded text-[10px]"
                        title="خوانده شد"
                      >
                        ✓
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotif(n.id)}
                      className="text-red-500 hover:bg-red-50 p-1 rounded text-[10px]"
                      title="حذف"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
