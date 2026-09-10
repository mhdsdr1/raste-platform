import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'sonner';

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      const res = await api.get('/ratings/reports/');
      setReports(res.data || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchReports(); }, []);

  const handleDeleteRating = async (ratingId) => {
    if (!window.confirm('نظر حذف شود؟')) return;
    try {
      await api.delete(`/ratings/${ratingId}/delete/`);
      toast.success('نظر حذف شد');
      fetchReports();
    } catch (err) {
      toast.error('خطا در حذف');
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#fdf2f8]">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-pink-100">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-base font-bold bg-gradient-to-r from-pink-700 to-pink-500 bg-clip-text text-transparent">راسته بازار</Link>
          <Link to="/" className="text-sm text-gray-500 hover:text-pink-600">← بازگشت</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-xl font-extrabold text-gray-800 mb-6">گزارش‌های نظرات</h1>
        
        {reports.length === 0 ? (
          <div className="text-center py-20"><div className="text-6xl mb-4">📋</div><p className="text-gray-500">گزارشی نیست</p></div>
        ) : (
          <div className="space-y-3">
            {reports.map(r => (
              <div key={r.id} className="bg-white rounded-2xl p-4 border">
                <p className="text-sm text-gray-800 mb-2">💬 {r.comment || 'بدون متن'}</p>
                <p className="text-xs text-orange-600 mb-2">🚩 دلیل: {r.reason}</p>
                <p className="text-xs text-gray-400 mb-2">گزارش‌دهنده: {r.reporter}</p>
                <button onClick={() => handleDeleteRating(r.rating_id)}
                  className="flex items-center gap-1 text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-xl">
                  <Trash2 size={14} /> حذف نظر
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
