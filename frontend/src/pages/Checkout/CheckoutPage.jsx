import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Truck, MapPin, Ticket, ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';
import { fadeIn } from '../../utils/animations';

export default function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const productId = searchParams.get('product');
  const { user, isAuthenticated } = useAuthStore();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  // فرم
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [courier, setCourier] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountError, setDiscountError] = useState('');
  const [applyingDiscount, setApplyingDiscount] = useState(false);

  useEffect(() => {
    if (!productId) return;
    const fetchProduct = async () => {
      try {
        const response = await api.get(`/shops/products/${productId}/`);
        setProduct(response.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId]);

  useEffect(() => {
    if (user) {
      setName(user.first_name || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  const applyDiscount = async () => {
    if (!discountCode || !product) return;
    setApplyingDiscount(true);
    setDiscountError('');
    try {
      const response = await api.post('/orders/discounts/validate/', {
        code: discountCode,
        seller_id: product.shop,
        order_amount: Number(product.price),
        phone: phone,
      });
      if (response.data.success) {
        setDiscountAmount(response.data.discount_amount);
      }
    } catch (err) {
      setDiscountError(err.response?.data?.error || 'کد نامعتبر');
      setDiscountAmount(0);
    } finally {
      setApplyingDiscount(false);
    }
  };

  const courierFee = courier ? 35000 : 0;
  const totalPrice = product ? Number(product.price) : 0;
  const finalPrice = totalPrice - discountAmount + courierFee;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdf2f8]">
        <div className="w-12 h-12 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdf2f8]">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-xl font-bold text-gray-700">محصول یافت نشد</h2>
          <Link to="/marketplace" className="text-pink-600 hover:underline mt-2 block">بازگشت به بازارچه</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdf2f8]">
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-pink-100">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-base font-bold bg-gradient-to-r from-pink-700 to-pink-500 bg-clip-text text-transparent">
            راسته بازار
          </Link>
          <Link to={`/product/${product.id}`} className="text-sm text-gray-500 hover:text-pink-600 flex items-center gap-1">
            <ArrowRight size={16} /> بازگشت
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <motion.div variants={fadeIn} initial="initial" animate="animate">
          
          {/* خلاصه محصول */}
          <div className="bg-white rounded-2xl p-4 mb-4 border border-gray-100 flex items-center gap-4">
            <div className="w-16 h-16 bg-pink-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">🛍️</div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm truncate">{product.title}</h3>
              <p className="text-xs text-gray-500">{product.shop_name}</p>
            </div>
            <div className="text-left flex-shrink-0">
              <span className="text-sm font-extrabold text-gray-900">{Number(product.price).toLocaleString('fa-IR')}</span>
              <span className="text-xs text-gray-500 block">تومان</span>
            </div>
          </div>

          {/* فرم اطلاعات */}
          <div className="bg-white rounded-2xl p-6 mb-4 border border-gray-100">
            <h2 className="font-bold text-gray-800 mb-4">اطلاعات دریافت‌کننده</h2>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">نام کامل</label>
                <input value={name} onChange={e => setName(e.target.value)}
                  placeholder="مثلاً: زهره محمدی" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">شماره تلفن</label>
                <input value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="۰۹۱۲۳۴۵۶۷۸۹" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm" dir="ltr" />
              </div>
              <div>
                <label className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                  <MapPin size={14} /> آدرس تحویل
                </label>
                <textarea value={address} onChange={e => setAddress(e.target.value)}
                  placeholder="آدرس کامل خود را وارد کنید..." rows={2}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm resize-none" />
              </div>
            </div>
          </div>

          {/* پیک */}
          <div className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
            <button
              onClick={() => setCourier(!courier)}
              className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                courier ? 'bg-pink-50 border-2 border-pink-300' : 'bg-gray-50 border-2 border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${courier ? 'bg-pink-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  <Truck size={20} />
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm text-gray-800">ارسال با پیک</p>
                  <p className="text-xs text-gray-500">تحویل درب منزل - ۳۵,۰۰۰ تومان</p>
                </div>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${courier ? 'border-pink-600 bg-pink-600' : 'border-gray-300'}`}>
                {courier && <div className="w-2 h-2 bg-white rounded-full" />}
              </div>
            </button>
          </div>

          {/* کد تخفیف */}
          <div className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
            <label className="flex items-center gap-1 text-sm text-gray-600 mb-2">
              <Ticket size={14} /> کد تخفیف
            </label>
            <div className="flex gap-2">
              <input value={discountCode} onChange={e => setDiscountCode(e.target.value)}
                placeholder="کد تخفیف را وارد کنید" className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 text-sm" />
              <button onClick={applyDiscount} disabled={applyingDiscount || !discountCode}
                className="px-4 py-2 bg-pink-600 text-white rounded-xl text-sm font-bold hover:bg-pink-700 disabled:opacity-50 transition-all">
                {applyingDiscount ? '...' : 'اعمال'}
              </button>
            </div>
            {discountAmount > 0 && (
              <p className="text-green-600 text-sm mt-2">✅ {discountAmount.toLocaleString('fa-IR')} تومان تخفیف اعمال شد</p>
            )}
            {discountError && (
              <p className="text-red-500 text-sm mt-2">❌ {discountError}</p>
            )}
          </div>

          {/* فاکتور نهایی */}
          <div className="bg-white rounded-2xl p-6 mb-4 border border-gray-100">
            <h2 className="font-bold text-gray-800 mb-4">فاکتور نهایی</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">قیمت محصول</span>
                <span className="text-gray-700">{totalPrice.toLocaleString('fa-IR')} تومان</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>تخفیف</span>
                  <span>-{discountAmount.toLocaleString('fa-IR')} تومان</span>
                </div>
              )}
              {courier && (
                <div className="flex justify-between">
                  <span className="text-gray-500">هزینه پیک</span>
                  <span className="text-gray-700">{courierFee.toLocaleString('fa-IR')} تومان</span>
                </div>
              )}
              <div className="border-t border-gray-100 pt-2 flex justify-between font-extrabold text-base">
                <span className="text-gray-800">مبلغ قابل پرداخت</span>
                <span className="text-pink-600">{finalPrice.toLocaleString('fa-IR')} تومان</span>
              </div>
            </div>
          </div>

          {/* دکمه پرداخت */}
          <button className="w-full bg-pink-600 hover:bg-pink-700 text-white py-4 rounded-2xl font-extrabold text-lg flex items-center justify-center gap-2 transition-all hover:shadow-xl hover:shadow-pink-200 active:scale-95">
            <ShieldCheck size={22} />
            پرداخت {finalPrice.toLocaleString('fa-IR')} تومان
            <ArrowLeft size={20} />
          </button>

          <p className="text-center text-xs text-gray-400 mt-4">
            با پرداخت، شرایط و قوانین راسته رو می‌پذیری
          </p>
        </motion.div>
      </main>
    </div>
  );
}
