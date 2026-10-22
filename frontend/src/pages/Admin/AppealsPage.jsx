import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../../services/api';

export default function AppealsPage() {
  const [appeals, setAppeals] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAppeals = async () => {
    setLoading(true);
    try {
      const res = await api.get('/shops/appeals/');
      setAppeals(res.data.appeals || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchAppeals(); }, []);

  const review = async (id, action) => {
    try {
      await api.patch(`/shops/appeals/${id}/review/`, { action });
      toast.success(action === 'accept' ? 'اعتراض پذیرفته شد' : 'اعتراض رد شد');
      fetchAppeals();
    } catch (e) { toast.error('خطا'); }
  };

  return (
    <div className="min-h-screen bg-[#fdf2f8] pb-8">
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-3 py-3 flex items-center gap-2">
          <Link to="/dashboard" className="text-xs text-gray-500 hover:text-pink-600">← داشبورد</Link>
          <h1 className="text-lg font-extrabold text-gray-800 flex-1">📩 اعتراض‌ها</h1>
          <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full">{appeals.length}</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-3 py-4">
        {loading ? (
          <div className="text-center py-8 text-gray-400 text-xs">در حال بارگذاری...</div>
        ) : appeals.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-xs bg-white rounded-2xl border">
            <span className="text-3xl block mb-2">✅</span>
            هیچ اعتراضی در انتظار بررسی نیست
          </div>
        ) : (
          <div className="space-y-3">
            {appeals.map(a => (
              <div key={a.id} className="bg-white rounded-xl border shadow-sm p-3">
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-xl">⚠️</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-800">{a.title}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">فروشگاه: {a.shop_name}</p>
                    <p className="text-[10px] text-red-600 mt-0.5">دلیل رد: {a.rejection_reason || 'نامشخص'}</p>
                  </div>
                </div>
                <div className="bg-pink-50 rounded-lg p-2 mb-2">
                  <p className="text-[10px] text-gray-500 mb-0.5">📝 متن اعتراض:</p>
                  <p className="text-xs text-gray-700">{a.appeal_text}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => review(a.id, 'accept')} className="flex-1 bg-green-500 text-white py-1.5 rounded-lg text-xs font-bold">✅ تایید و انتشار</button>
                  <button onClick={() => review(a.id, 'reject')} className="flex-1 bg-red-500 text-white py-1.5 rounded-lg text-xs font-bold">❌ رد اعتراض</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
