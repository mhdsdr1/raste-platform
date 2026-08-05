import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Truck, Handshake, Store, ArrowRight, ShoppingCart, ShieldCheck, Bell, BellRing } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'sonner';

const COLORS = [
  { name: 'قرمز', hex: '#dc2626' }, { name: 'آبی', hex: '#2563eb' }, { name: 'سبز', hex: '#16a34a' },
  { name: 'زرد', hex: '#eab308' }, { name: 'نارنجی', hex: '#f97316' }, { name: 'بنفش', hex: '#9333ea' },
  { name: 'صورتی', hex: '#ec4899' }, { name: 'سرخابی', hex: '#db2777' }, { name: 'مشکی', hex: '#1f2937' },
  { name: 'سفید', hex: '#f9fafb' }, { name: 'کرم', hex: '#fef3c7' }, { name: 'قهوه‌ای', hex: '#92400e' },
  { name: 'خاکستری', hex: '#6b7280' }, { name: 'نیلی', hex: '#312e81' }, { name: 'فیروزه‌ای', hex: '#0891b2' },
];

export default function ProductPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifyPhone, setNotifyPhone] = useState('');
  const [showNotify, setShowNotify] = useState(false);

  useEffect(() => {
    api.get(`/shops/products/${id}/`).then(res => setProduct(res.data)).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const handleNotify = async () => {
    if (!notifyPhone || notifyPhone.length !== 11) { toast.error('شماره معتبر وارد کن'); return; }
    try {
      await api.post(`/shops/products/${id}/notify/`, { phone: notifyPhone });
      toast.success('بهت خبر میدیم!');
      setShowNotify(false);
    } catch { toast.error('خطا'); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin" /></div>;
  if (!product) return <div className="min-h-screen flex items-center justify-center"><p>محصول یافت نشد</p></div>;

  const isOutOfStock = product.stock === 0;
  const colorHex = COLORS.find(c => c.name === product.color)?.hex;

  return (
    <div className="min-h-screen bg-[#fdf2f8]">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-pink-100">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-base font-bold bg-gradient-to-r from-pink-700 to-pink-500 bg-clip-text text-transparent">راسته بازار</Link>
          <Link to="/marketplace" className="text-sm text-gray-500 hover:text-pink-600">← بازارچه</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="grid md:grid-cols-2 gap-0">
            <div className="aspect-square bg-gradient-to-br from-pink-50 to-pink-100 flex items-center justify-center p-8 relative">
              {product.image ? <img src={product.image} alt={product.title} className="w-full h-full object-contain rounded-2xl" /> : <div className="text-8xl">🛍️</div>}
              {isOutOfStock && <div className="absolute top-4 left-4 bg-red-500 text-white text-sm px-3 py-1.5 rounded-full font-bold">اتمام موجودی</div>}
            </div>
            <div className="p-6 md:p-8 flex flex-col justify-between">
              <div>
                <h1 className="text-xl md:text-2xl font-extrabold text-gray-900 mb-3">{product.title}</h1>
                
                <Link to={`/shop/${product.shop?.slug || product.shop}`} className="flex items-center gap-2 text-sm text-pink-600 hover:text-pink-700 mb-4">
                  <Store size={16} /> {product.shop_name || 'فروشگاه'}
                  {product.shop_rating > 0 && <span className="flex items-center gap-0.5 text-yellow-600"><Star size={14} fill="currentColor" /> {product.shop_rating}</span>}
                </Link>

                <p className="text-sm text-gray-600 mb-4">{product.description}</p>
                
                {/* رنگ محصول */}
                {product.color && (
                  colorHex ? (
                    <div className="flex items-center gap-2 mb-3">
                      <div style={{ width: "20px", height: "20px", borderRadius: "50%", backgroundColor: colorHex, border: "2px solid #e5e7eb" }} />
                    </div>
                  ) : (
                    <div className="mb-3">
                      <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">🎨 {product.color}</span>
                    </div>
                  )
                )}
                
                {isOutOfStock && (
                  <div className="bg-red-50 rounded-2xl p-4 mb-4 border border-red-200">
                    <p className="text-red-700 font-bold text-sm mb-2">❌ این محصول فعلاً موجود نیست</p>
                    {!showNotify ? (
                      <button onClick={() => setShowNotify(true)} className="flex items-center gap-2 text-sm text-pink-600 hover:text-pink-700 font-bold">
                        <Bell size={16} /> در صورت موجود شدن به من خبر بده
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <input type="tel" value={notifyPhone} onChange={e => setNotifyPhone(e.target.value)} placeholder="۰۹۱۲۳۴۵۶۷۸۹" className="flex-1 px-3 py-2 border rounded-xl text-sm" dir="ltr" />
                        <button onClick={handleNotify} className="bg-pink-600 text-white px-4 py-2 rounded-xl text-sm font-bold"><BellRing size={16} /></button>
                      </div>
                    )}
                  </div>
                )}

                {product.stock > 0 && product.stock <= 5 && (
                  <div className="bg-orange-50 rounded-2xl p-3 mb-4 border border-orange-200">
                    <p className="text-orange-700 text-sm">⚠️ فقط {product.stock} عدد دیگر موجود است</p>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 pt-4 mt-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-3xl font-extrabold text-gray-900">{Number(product.price).toLocaleString('fa-IR')}</span>
                    <span className="text-sm text-gray-500 mr-2">تومان</span>
                  </div>
                </div>
                {!isOutOfStock && (
                  <Link to={`/checkout?product=${product.id}`} className="w-full bg-pink-600 hover:bg-pink-700 text-white py-3.5 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all">
                    <ShoppingCart size={22} /> خرید و پرداخت <ArrowRight size={20} />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
