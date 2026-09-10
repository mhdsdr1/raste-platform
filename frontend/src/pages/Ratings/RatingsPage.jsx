import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Edit3, Trash2, Flag } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'sonner';
import useAuthStore from '../../store/authStore';

export default function RatingsPage() {
  const { productId } = useParams();
  const { user } = useAuthStore();
  const [product, setProduct] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [stars, setStars] = useState(0);
  const [hoverStars, setHoverStars] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const productRes = await api.get(`/shops/products/${productId}/`);
      setProduct(productRes.data);
      const sellerId = productRes.data.owner_name ? productRes.data.shop : productRes.data.shop;
      // owner_id از API محصول نمیاد، پس از shop استفاده میکنیم
      // ولی ratings برای owner ثبت میشن نه shop
      // پس باید rated_user رو پیدا کنیم
      const shopRes = await api.get(`/shops/${productRes.data.shop}/`);
      const ownerId = shopRes.data.owner;
      const ratingsRes = await api.get(`/ratings/user/${ownerId}/?type=seller`);
      setRatings(ratingsRes.data.ratings || []);
      setSummary(ratingsRes.data.summary || null);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [productId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stars) { toast.error('ستاره انتخاب کن'); return; }
    setSubmitting(true);
    try {
      if (editingId) {
        await api.patch(`/ratings/${editingId}/`, { stars, comment });
        toast.success('نظر ویرایش شد');
      } else {
        await api.post('/ratings/create/', {
          product_id: Number(productId),
          target_type: 'seller',
          stars,
          comment,
        });
        toast.success('امتیاز ثبت شد');
      }
      setShowForm(false);
      setEditingId(null);
      setStars(0);
      setComment('');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'خطا');
    } finally { setSubmitting(false); }
  };

  const handleEdit = (r) => {
    setEditingId(r.id);
    setStars(r.stars);
    setComment(r.comment || '');
    setShowForm(true);
  };

  const handleReport = async (ratingId) => {
    const reason = window.prompt('دلیل گزارش را بنویسید:');
    if (!reason) return;
    try {
      await api.post(`/ratings/report/${ratingId}/`, { reason });
      toast.success('گزارش ثبت شد');
    } catch (err) {
      toast.error('خطا در گزارش');
    }
  };

  const handleDelete = async (r) => {
    if (!window.confirm('این نظر حذف شود؟')) return;
    try {
      await api.delete(`/ratings/${r.id}/delete/`);
      toast.success('نظر حذف شد');
      fetchData();
    } catch (err) {
      toast.error('خطا در حذف');
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin" /></div>;
  if (!product) return <div className="min-h-screen flex items-center justify-center"><p>محصول یافت نشد</p></div>;

  return (
    <div className="min-h-screen bg-[#fdf2f8]">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-pink-100">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-base font-bold bg-gradient-to-r from-pink-700 to-pink-500 bg-clip-text text-transparent">راسته بازار</Link>
          <Link to={`/product/${productId}`} className="text-sm text-gray-500 hover:text-pink-600">← محصول</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* خلاصه امتیاز */}
        <div className="bg-white rounded-2xl p-6 mb-4 border text-center">
          <div className="text-4xl font-extrabold text-pink-600">
            {summary?.average_stars ? `${Math.round((summary.average_stars / 3) * 100)}%` : '0%'}
          </div>
          <div className="flex justify-center text-yellow-400 my-2">
            {[1,2,3].map(i => (
              <Star key={i} size={24} fill={i <= Math.round(summary?.average_stars || 0) ? 'currentColor' : 'none'} />
            ))}
          </div>
          <p className="text-sm text-gray-500">{summary?.total_ratings || 0} نظر ثبت شده</p>
        </div>

        {/* دکمه ثبت */}
        {!showForm ? (
          <button onClick={() => { setEditingId(null); setStars(0); setComment(''); setShowForm(true); }}
            className="w-full bg-pink-600 text-white py-3 rounded-2xl font-bold mb-6">
            ⭐ ثبت امتیاز
          </button>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 mb-6 border">
            <h3 className="font-bold text-gray-800 mb-4">{editingId ? 'ویرایش نظر' : 'امتیاز شما'}</h3>
            <div className="flex gap-1 mb-4">
              {[1,2,3].map(i => (
                <Star key={i} size={36} className="cursor-pointer"
                  fill={i <= (hoverStars || stars) ? '#facc15' : 'none'}
                  stroke={i <= (hoverStars || stars) ? '#facc15' : '#d1d5db'}
                  onMouseEnter={() => setHoverStars(i)}
                  onMouseLeave={() => setHoverStars(0)}
                  onClick={() => setStars(i)} />
              ))}
            </div>
            <textarea value={comment} onChange={e => setComment(e.target.value)}
              placeholder="نظر خود را بنویسید..." rows={3}
              className="w-full px-4 py-2.5 border rounded-xl text-sm mb-4 resize-none" />
            <div className="flex gap-2">
              <button type="submit" disabled={submitting}
                className="flex-1 bg-pink-600 text-white py-2.5 rounded-xl font-bold">
                {submitting ? '...' : editingId ? 'ذخیره ویرایش' : 'ثبت امتیاز'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }}
                className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-xl font-bold">انصراف</button>
            </div>
          </form>
        )}

        {/* نظرات */}
        <div className="space-y-3">
          {ratings.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-5xl mb-3">📝</div>
              <p className="text-gray-500">هنوز نظری ثبت نشده</p>
            </div>
          ) : (
            ratings.map(r => {
              const isOwner = user?.id === r.rater;
              return (
                <div key={r.id} className="bg-white rounded-2xl p-4 border">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center text-sm font-bold">
                      {r.rater_name?.[0] || 'ک'}
                    </div>
                    <span className="font-bold text-sm">{r.rater_name || 'کاربر'}</span>
                    <div className="flex text-yellow-400 mr-auto">
                      {[1,2,3].map(i => <Star key={i} size={14} fill={i <= r.stars ? 'currentColor' : 'none'} />)}
                    </div>
                    <button onClick={() => handleReport(r.id)} className="text-gray-400 hover:text-orange-500">
                      <Flag size={14} />
                    </button>
                    {isOwner && (
                      <div className="flex gap-1">
                        <button onClick={() => handleEdit(r)} className="text-blue-500"><Edit3 size={14} /></button>
                        <button onClick={() => handleDelete(r)} className="text-red-500"><Trash2 size={14} /></button>
                      </div>
                    )}
                  </div>
                  {r.comment && <p className="text-sm text-gray-600">{r.comment}</p>}
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
