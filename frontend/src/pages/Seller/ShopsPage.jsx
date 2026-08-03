import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Store, Plus, Edit3, BarChart3, Package, Phone, Eye, EyeOff, X, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import { fadeIn, stagger } from '../../utils/animations';
import { toast } from 'sonner';

export default function SellerShopsPage() {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [shopType, setShopType] = useState('social');
  const [address, setAddress] = useState('');
  
  // شماره‌ها
  const [phones, setPhones] = useState([
    { number: '', show: true }
  ]);

  const fetchShops = async () => {
    try {
      const response = await api.get('/shops/my/');
      setShops(response.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShops();
  }, []);

  const generateSlug = (name) => {
    return name
      .replace(/[\s]+/g, '-')
      .replace(/[^\u0600-\u06FF\w\-]/g, '')
      + '-' + Math.random().toString(36).substring(2, 6);
  };

  // اعتبارسنجی شماره تلفن
  const validatePhone = (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length !== 11) return false;
    if (!cleaned.startsWith('09')) return false;
    return true;
  };

  const formatPhone = (phone) => {
    const cleaned = phone.replace(/\D/g, '').slice(0, 11);
    if (cleaned.length <= 4) return cleaned;
    if (cleaned.length <= 7) return `${cleaned.slice(0, 4)} ${cleaned.slice(4)}`;
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  };

  const addPhone = () => {
    if (phones.length >= 3) {
      toast.error('حداکثر ۳ شماره می‌تونی ثبت کنی');
      return;
    }
    setPhones([...phones, { number: '', show: true }]);
  };

  const removePhone = (index) => {
    if (phones.length <= 1) {
      toast.error('حداقل یک شماره الزامی است');
      return;
    }
    setPhones(phones.filter((_, i) => i !== index));
  };

  const updatePhone = (index, value) => {
    const newPhones = [...phones];
    newPhones[index].number = value;
    setPhones(newPhones);
  };

  const togglePhoneVisibility = (index) => {
    const newPhones = [...phones];
    newPhones[index].show = !newPhones[index].show;
    setPhones(newPhones);
  };

  const handleCreateShop = async (e) => {
    e.preventDefault();
    
    // اعتبارسنجی نام
    if (!name.trim()) {
      toast.error('نام فروشگاه الزامی است');
      return;
    }

    // اعتبارسنجی شماره‌ها
    const validPhones = phones.filter(p => p.number.trim());
    if (validPhones.length === 0) {
      toast.error('حداقل یک شماره تلفن الزامی است');
      return;
    }

    for (let phone of phones) {
      if (phone.number.trim() && !validatePhone(phone.number)) {
        toast.error('شماره تلفن باید ۱۱ رقمی و با ۰۹ شروع شود');
        return;
      }
    }

    // چک تکراری نبودن شماره‌ها
    const numbers = phones.filter(p => p.number.trim()).map(p => p.number.replace(/\D/g, ''));
    if (new Set(numbers).size !== numbers.length) {
      toast.error('شماره‌های تکراری وجود دارد');
      return;
    }

    setCreating(true);
    try {
      const slug = generateSlug(name);
      const phoneData = phones.filter(p => p.number.trim()).map(p => ({
        number: p.number.replace(/\D/g, ''),
        show: p.show,
      }));

      await api.post('/shops/', {
        name,
        slug,
        description,
        shop_type: shopType,
        phones: phoneData,
        address,
      });
      
      toast.success('فروشگاه با موفقیت ساخته شد! 🎉');
      setShowCreate(false);
      resetForm();
      fetchShops();
    } catch (err) {
      toast.error(err.response?.data?.error || 'خطا در ایجاد فروشگاه');
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setShopType('social');
    setAddress('');
    setPhones([{ number: '', show: true }]);
  };

  const shopTypes = [
    { 
      value: 'social', 
      label: '📱 فروشنده شبکه اجتماعی',
      desc: 'محصولات رو توی اینستاگرام، تلگرام و ایتا می‌فروشی و مشتری‌هات از همونجا خرید می‌کنن'
    },
    { 
      value: 'hybrid', 
      label: '🔄 فروشنده همه‌کاره',
      desc: 'هم توی پیج و کانال می‌فروشی، هم دوست داری یه سایت فروشگاهی مرتب داشته باشی'
    },
    { 
      value: 'network', 
      label: '📞 فروشنده پیامکی',
      desc: 'بیشتر با تماس تلفنی و پیامک به مشتری‌های قدیمی و فامیل می‌فروشی'
    },
  ];

  const shopTypeLabels = {
    social: '📱 فروشنده شبکه اجتماعی',
    hybrid: '🔄 فروشنده همه‌کاره',
    network: '📞 فروشنده پیامکی',
  };

  const selectedType = shopTypes.find(t => t.value === shopType);

  return (
    <div className="min-h-screen bg-[#fdf2f8]">
      
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-pink-100">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-base font-bold bg-gradient-to-r from-pink-700 to-pink-500 bg-clip-text text-transparent">
            راسته بازار
          </Link>
          <Link to="/dashboard" className="text-sm text-gray-500 hover:text-pink-600">
            ← داشبورد
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
            <Store className="text-pink-600" size={22} />
            فروشگاه‌های من
          </h1>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1.5 bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all"
          >
            <Plus size={18} />
            فروشگاه جدید
          </button>
        </div>

        {/* Create Form */}
        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-6"
            >
              <form onSubmit={handleCreateShop} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h2 className="font-bold text-gray-800 mb-6">ایجاد فروشگاه جدید</h2>
                
                <div className="space-y-5">
                  
                  {/* نام فروشگاه */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">نام فروشگاه *</label>
                    <input value={name} onChange={e => setName(e.target.value)}
                      placeholder="مثلاً: فروشگاه من" 
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent" />
                    <p className="text-xs text-gray-400 mt-1">🔗 آدرس فروشگاه (raste.ir/...) به صورت خودکار ساخته میشه</p>
                  </div>

                  {/* نوع فروشنده */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">نوع فروشنده *</label>
                    <div className="relative">
                      <select
                        value={shopType}
                        onChange={(e) => setShopType(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent appearance-none cursor-pointer bg-white"
                      >
                        {shopTypes.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                          <path d="M1 1.5L6 6.5L11 1.5" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </div>
                    </div>
                    {/* توضیح نوع انتخاب شده */}
                    {selectedType && (
                      <div className="mt-2 bg-pink-50 rounded-xl p-3 border border-pink-100">
                        <p className="text-xs text-pink-700">{selectedType.desc}</p>
                      </div>
                    )}
                  </div>

                  {/* شماره تلفن‌ها */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-bold text-gray-700">شماره تلفن *</label>
                      <button
                        type="button"
                        onClick={addPhone}
                        disabled={phones.length >= 3}
                        className="text-xs text-pink-600 hover:text-pink-700 font-bold disabled:opacity-30 flex items-center gap-1"
                      >
                        <Plus size={14} /> افزودن شماره
                      </button>
                    </div>
                    
                    <div className="space-y-2">
                      {phones.map((phone, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <Phone className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                              type="tel"
                              value={phone.number}
                              onChange={(e) => updatePhone(index, e.target.value)}
                              placeholder="۰۹۱۲ ۳۴۵ ۶۷۸۹"
                              className="w-full pr-10 pl-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                              dir="ltr"
                            />
                          </div>
                          
                          {/* دکمه نمایش/عدم نمایش */}
                          <button
                            type="button"
                            onClick={() => togglePhoneVisibility(index)}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                              phone.show 
                                ? 'bg-green-50 text-green-600 hover:bg-green-100' 
                                : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                            }`}
                            title={phone.show ? 'شماره نمایش داده میشه' : 'شماره مخفی میمونه'}
                          >
                            {phone.show ? <Eye size={16} /> : <EyeOff size={16} />}
                          </button>

                          {/* حذف شماره */}
                          {phones.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removePhone(index)}
                              className="w-9 h-9 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl flex items-center justify-center transition-all"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                      <AlertCircle size={12} />
                      حداکثر ۳ شماره می‌تونی ثبت کنی. هر شماره باید ۱۱ رقمی و با ۰۹ شروع بشه.
                    </p>
                  </div>

                  {/* توضیحات */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">توضیحات فروشگاه</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)}
                      placeholder="درباره فروشگاهت بنویس... چی می‌فروشی؟ چرا باید از تو بخرن؟"
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none" />
                  </div>

                  {/* آدرس */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">آدرس (اختیاری)</label>
                    <input value={address} onChange={e => setAddress(e.target.value)}
                      placeholder="آدرس فروشگاه یا محل تحویل سفارش..."
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent" />
                  </div>
                </div>

                {/* دکمه‌ها */}
                <div className="flex gap-2 mt-8 pt-4 border-t border-gray-100">
                  <button type="submit" disabled={creating}
                    className="flex-1 bg-pink-600 hover:bg-pink-700 text-white py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50">
                    {creating ? '⏳ در حال ایجاد...' : '✅ ایجاد فروشگاه'}
                  </button>
                  <button type="button" onClick={() => { setShowCreate(false); resetForm(); }}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-3 rounded-xl text-sm font-bold transition-all">
                    انصراف
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Shops List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
                <div className="h-5 bg-gray-100 rounded w-1/3 mb-3" />
                <div className="h-4 bg-gray-100 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : shops.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🏪</div>
            <h3 className="text-lg font-bold text-gray-700 mb-2">هنوز فروشگاهی نساختی!</h3>
            <p className="text-gray-500 text-sm mb-4">اولین فروشگاهت رو بساز و محصولاتت رو بفروش</p>
            <button onClick={() => setShowCreate(true)}
              className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-3 rounded-xl font-bold transition-all inline-flex items-center gap-2">
              <Plus size={18} /> ساخت فروشگاه
            </button>
          </div>
        ) : (
          <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-4">
            {shops.map((shop) => (
              <motion.div key={shop.id} variants={fadeIn}
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-pink-400 to-pink-600 rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                      {shop.name[0]}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-gray-800 text-lg">{shop.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">raste.ir/{shop.slug}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs bg-pink-50 text-pink-700 px-2 py-0.5 rounded-full">
                          {shopTypeLabels[shop.shop_type] || shop.shop_type}
                        </span>
                        <span className="text-xs text-gray-500">
                          <Package size={12} className="inline mr-1" />
                          {shop.active_products_count || 0} محصول
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/seller/shops/${shop.id}/products`}
                      className="w-9 h-9 bg-pink-50 hover:bg-pink-100 text-pink-600 rounded-xl flex items-center justify-center transition-all">
                      <Package size={16} />
                    </Link>
                    <Link to={`/seller/shops/${shop.id}/edit`}
                      className="w-9 h-9 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl flex items-center justify-center transition-all">
                      <Edit3 size={16} />
                    </Link>
                    <Link to={`/seller/shops/${shop.id}/analytics`}
                      className="w-9 h-9 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center transition-all">
                      <BarChart3 size={16} />
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>
    </div>
  );
}
