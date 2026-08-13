import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import api from '../../services/api';
import { stagger } from '../../utils/animations';

const COLORS = [
  { name: 'قرمز', hex: '#dc2626' }, { name: 'آبی', hex: '#2563eb' }, { name: 'سبز', hex: '#16a34a' },
  { name: 'زرد', hex: '#eab308' }, { name: 'نارنجی', hex: '#f97316' }, { name: 'بنفش', hex: '#9333ea' },
  { name: 'صورتی', hex: '#ec4899' }, { name: 'سرخابی', hex: '#db2777' }, { name: 'مشکی', hex: '#1f2937' },
  { name: 'سفید', hex: '#f9fafb' }, { name: 'کرم', hex: '#fef3c7' }, { name: 'قهوه‌ای', hex: '#92400e' },
  { name: 'خاکستری', hex: '#6b7280' }, { name: 'نیلی', hex: '#312e81' }, { name: 'فیروزه‌ای', hex: '#0891b2' },
];

export default function ShopPage() {
  const { slug } = useParams();
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShop = async () => {
      try {
        const marketRes = await api.get(`/shops/marketplace/?q=${slug}&page_size=50`);
        if (marketRes.data.results?.length > 0) {
          const firstProduct = marketRes.data.results[0];
          const shopId = firstProduct.shop?.id;
          setShop(firstProduct.shop || { name: 'فروشگاه' });
          if (shopId) {
            const productsRes = await api.get(`/shops/${shopId}/products/list/`);
            setProducts(productsRes.data || []);
          }
        }
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    fetchShop();
  }, [slug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin" /></div>;
  if (!shop) return <div className="min-h-screen flex items-center justify-center"><p>فروشگاه یافت نشد</p></div>;

  return (
    <div className="min-h-screen bg-[#fdf2f8]">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-pink-100">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-base font-bold bg-gradient-to-r from-pink-700 to-pink-500 bg-clip-text text-transparent">راسته بازار</Link>
          <Link to="/marketplace" className="text-sm bg-pink-600 text-white px-4 py-2 rounded-xl hover:bg-pink-700 transition-all">🛍️ بازارچه</Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="bg-white rounded-3xl p-6 mb-6 border shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-gradient-to-br from-pink-400 to-pink-600 rounded-2xl flex items-center justify-center text-white text-3xl font-bold">{shop.name?.[0] || 'ف'}</div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">{shop.name}</h1>
              {shop.city && <p className="text-sm text-gray-500 flex items-center gap-1 mt-1"><MapPin size={14} /> {shop.city}</p>}
              <p className="text-sm text-gray-500 mt-1">{products.length} محصول</p>
            </div>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-20"><div className="text-6xl mb-4">📦</div><h3 className="text-lg font-bold text-gray-700">این فروشگاه هنوز محصولی نداره</h3></div>
        ) : (
          <motion.div variants={stagger} initial="initial" animate="animate" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {products.map(product => {
              const colorHex = COLORS.find(c => c.name === product.color)?.hex;
              return (
                <motion.div key={product.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -4 }}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all overflow-hidden">
                  <Link to={`/product/${product.id}`}>
                    <div className="aspect-square bg-gradient-to-br from-pink-50 to-pink-100 flex items-center justify-center text-4xl">
                      {product.image ? <img src={product.image} alt={product.title} className="w-full h-full object-cover" /> : '🛍️'}
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-sm text-gray-800 truncate">{product.title}</h3>
                      {colorHex && <div className="flex items-center gap-1.5 mt-1"><div style={{ width: "14px", height: "14px", borderRadius: "50%", backgroundColor: colorHex, border: "1px solid #d1d5db", display: "inline-block" }} /></div>}
                      <p className="text-sm font-extrabold text-pink-600 mt-1">{Number(product.price).toLocaleString('fa-IR')} تومان</p>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </main>
    </div>
  );
}
