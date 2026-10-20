import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function NotificationSystem() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadNormal, setUnreadNormal] = useState(0);
  const [unreadAlert, setUnreadAlert] = useState(0);
  const [showList, setShowList] = useState(false);
  const [toast, setToast] = useState(null);
  const [isAuth, setIsAuth] = useState(false);
  const lastNotifIdRef = useRef(null);

  const fetchNotifications = async (showToast = false) => {
    try {
      const res = await api.get('/users/notifications/');
      const list = res.data.notifications || [];
      setNotifications(list);
      
      const unread = list.filter(n => !n.is_read);
      setUnreadNormal(unread.filter(n => n.notif_type !== 'alert').length);
      setUnreadAlert(unread.filter(n => n.notif_type === 'alert').length);
      
      if (showToast && list.length > 0) {
        const latest = list[0];
        if (lastNotifIdRef.current && latest.id !== lastNotifIdRef.current && !latest.is_read) {
          setToast(latest);
          setTimeout(() => setToast(null), 6000);
        }
      }
      
      if (list.length > 0) lastNotifIdRef.current = list[0].id;
    } catch (e) {}
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    setIsAuth(true);
    fetchNotifications(false);
    const interval = setInterval(() => fetchNotifications(true), 30000);
    return () => clearInterval(interval);
  }, []);

  if (!isAuth) return null;

  const markRead = async (notif) => {
    if (!notif.is_read) {
      try {
        await api.patch(`/users/notifications/${notif.id}/read/`);
        setNotifications(prev => prev.map(x => x.id === notif.id ? {...x, is_read: true} : x));
        if (notif.notif_type === 'alert') setUnreadAlert(prev => Math.max(0, prev - 1));
        else setUnreadNormal(prev => Math.max(0, prev - 1));
      } catch (e) {}
    }
  };

  const markAllRead = async () => {
    try {
      await api.patch('/users/notifications/read-all/');
      setNotifications(prev => prev.map(x => ({...x, is_read: true})));
      setUnreadNormal(0);
      setUnreadAlert(0);
    } catch (e) {}
  };

  const handleClick = (notif) => {
    markRead(notif);
    if (notif.link) {
      setShowList(false);
      navigate(notif.link);
    }
  };

  return (
    <>
      {/* دکمه‌های زنگ — ثابت بالای صفحه */}
      {isAuth && (
        <div className="fixed top-3 left-3 z-[9997] flex items-center gap-1">
          {/* زنگ معمولی */}
          <button 
            onClick={() => setShowList(true)}
            className="relative bg-white shadow-lg rounded-full p-2 text-lg hover:scale-105 transition-transform"
            title="نوتیفیکیشن‌ها"
          >
            🔔
            {unreadNormal > 0 && (
              <span className="absolute -top-1 -right-1 bg-pink-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                {unreadNormal > 99 ? '99+' : unreadNormal}
              </span>
            )}
          </button>
          
          {/* زنگ هشدار */}
          {unreadAlert > 0 && (
            <button 
              onClick={() => setShowList(true)}
              className="relative bg-white shadow-lg rounded-full p-2 text-lg hover:scale-105 transition-transform animate-pulse"
              title="گزارشات"
            >
              ⚠️
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                {unreadAlert > 99 ? '99+' : unreadAlert}
              </span>
            </button>
          )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-md px-3">
          <div className={`bg-white rounded-xl shadow-2xl border-2 p-3 flex items-start gap-2 ${
            toast.notif_type === 'alert' ? 'border-red-400' : 'border-pink-300'
          }`}>
            <span className="text-xl">{toast.icon || '🔔'}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-bold ${toast.notif_type === 'alert' ? 'text-red-600' : 'text-gray-800'}`}>
                {toast.title}
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">{toast.message}</p>
            </div>
            <button onClick={() => setToast(null)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
          </div>
        </div>
      )}

      {/* مودال لیست */}
      {showList && (
        <div className="fixed inset-0 bg-black/50 z-[9998] flex items-start justify-center p-3 pt-16" onClick={() => setShowList(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl max-h-[75vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 border-b bg-gradient-to-l from-pink-500 to-pink-600 rounded-t-2xl">
              <h3 className="font-bold text-white text-sm">
                🔔 نوتیفیکیشن‌ها 
                {unreadNormal > 0 && <span className="mr-1 text-[10px] bg-white/20 px-1.5 py-0.5 rounded">{unreadNormal}</span>}
                {unreadAlert > 0 && <span className="mr-1 text-[10px] bg-red-600 px-1.5 py-0.5 rounded">⚠️ {unreadAlert}</span>}
              </h3>
              <button onClick={() => setShowList(false)} className="text-white text-lg">✕</button>
            </div>
            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <p className="text-center text-gray-400 text-xs py-8">نوتیفیکیشنی نداری</p>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    className={`p-3 border-b hover:bg-gray-50 cursor-pointer ${
                      !n.is_read 
                        ? (n.notif_type === 'alert' ? 'bg-red-50/50' : 'bg-pink-50/30')
                        : ''
                    }`}
                    onClick={() => handleClick(n)}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-lg">{n.icon || '🔔'}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold ${
                          n.notif_type === 'alert' ? 'text-red-700' : 'text-gray-800'
                        }`}>
                          {n.title}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{n.message}</p>
                        <p className="text-[9px] text-gray-400 mt-1">{n.created_at_shamsi}</p>
                      </div>
                      {!n.is_read && (
                        <span className={`w-2 h-2 rounded-full mt-1 ${
                          n.notif_type === 'alert' ? 'bg-red-500' : 'bg-pink-500'
                        }`}></span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-2 border-t bg-gray-50 flex gap-1">
              {(unreadNormal + unreadAlert) > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex-1 text-[10px] text-pink-600 font-bold py-1 bg-white rounded"
                >
                  ✅ خواندن همه
                </button>
              )}
              <button
                onClick={() => { setShowList(false); navigate('/notifications'); }}
                className="flex-1 text-[10px] text-white bg-pink-500 font-bold py-1 rounded"
              >
                📋 مشاهده همه
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
