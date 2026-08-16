import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Eye, EyeOff, Package, Truck, Handshake, LayoutGrid, List, X, AlertTriangle, Save } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'sonner';
import useProductsStore from '../../store/productsStore';

const CONDITIONS = [
  { value: 'new', label: '🟢 نو' }, { value: 'like_new', label: '🔵 در حد نو' },
  { value: 'used', label: '🟠 کارکرده' }, { value: 'needs_repair', label: '🔴 نیاز به تعمیر' },
];

const CATEGORIES = [
  'انتخاب دسته‌بندی...', '📱 موبایل و تبلت', '💻 لپتاپ و کامپیوتر', '👗 پوشاک',
  '👟 کفش و کیف', '🍔 خوراکی', '🏠 لوازم خانگی', '📚 کتاب و لوازم التحریر',
  '💄 آرایشی و بهداشتی', '🧸 اسباب بازی', '⚽ ورزشی', '🚗 خودرو', '🏠 املاک', '🏪 سایر',
];

const COLORS = [
  { name: 'قرمز', hex: '#dc2626' }, { name: 'آبی', hex: '#2563eb' }, { name: 'سبز', hex: '#16a34a' },
  { name: 'زرد', hex: '#eab308' }, { name: 'نارنجی', hex: '#f97316' }, { name: 'بنفش', hex: '#9333ea' },
  { name: 'صورتی', hex: '#ec4899' }, { name: 'سرخابی', hex: '#db2777' }, { name: 'مشکی', hex: '#1f2937' },
  { name: 'سفید', hex: '#f9fafb' }, { name: 'کرم', hex: '#fef3c7' }, { name: 'قهوه‌ای', hex: '#92400e' },
  { name: 'خاکستری', hex: '#6b7280' }, { name: 'نیلی', hex: '#312e81' }, { name: 'فیروزه‌ای', hex: '#0891b2' },
];

export default function SellerProductsPage() {
  const { id: shopId } = useParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [viewMode, setViewMode] = useState('list');

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [priceDisplay, setPriceDisplay] = useState('');
  const [stock, setStock] = useState('');
  const [lowStockAlert, setLowStockAlert] = useState('3');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [condition, setCondition] = useState('new');
  const [allowCourier, setAllowCourier] = useState(false);
  const [allowTest, setAllowTest] = useState(false);

  const [colorsList, setColorsList] = useState([]);
  const [newColorName, setNewColorName] = useState('');
  const [newColorStock, setNewColorStock] = useState('');
  const [showColorSuggestions, setShowColorSuggestions] = useState(false);

  const [sizesList, setSizesList] = useState([]);
  const [newSizeName, setNewSizeName] = useState('');
  const [newSizeStock, setNewSizeStock] = useState('');

  const fetchProducts = async () => {
    try {
      const res = await api.get(`/shops/${shopId}/products/all/`);
      setProducts(res.data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const refreshKey = useProductsStore(s => s.refreshKey);
  useEffect(() => { fetchProducts(); }, [shopId, refreshKey]);
  useEffect(() => {
    fetchProducts();
  }, []);
  useEffect(() => {
    fetchProducts();
  }, []); // هر بار که صفحه mount میشه، fetch کن

  const formatPrice = (val) => {
    const num = String(val).replace(/\D/g, '');
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const handlePriceChange = (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setPrice(raw);
    setPriceDisplay(formatPrice(raw));
  };

  const handlePriceBlur = () => { if (price) setPriceDisplay(formatPrice(price)); };

  
const digits = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
const teens = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
const tens = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
const thousands = ['', 'هزار', 'میلیون', 'میلیارد'];

function threeDigits(n) {
  const h = Math.floor(n / 100);
  const r = n % 100;
  let result = '';
  if (h > 0) result += digits[h] + ' صد';
  if (r >= 10 && r < 20) result += (result ? ' و ' : '') + teens[r - 10];
  else {
    const d = Math.floor(r / 10);
    const u = r % 10;
    if (d > 0) result += (result ? ' و ' : '') + tens[d];
    if (u > 0) result += (result ? ' و ' : '') + digits[u];
  }
  return result;
}

function numberToWords(num) {
  if (num === 0) return 'صفر';
  let result = '';
  let groupIndex = 0;
  while (num > 0) {
    const group = num % 1000;
    if (group > 0) {
      const groupStr = threeDigits(group);
      result = groupStr + (thousands[groupIndex] ? ' ' + thousands[groupIndex] : '') + (result ? ' و ' + result : '');
    }
    num = Math.floor(num / 1000);
    groupIndex++;
  }
  return result + ' تومان';
}

const filteredColors = newColorName ? COLORS.filter(c => c.name.includes(newColorName)) : [];

  const addColor = () => {
    if (!newColorName) { toast.error('نام رنگ را وارد کن'); return; }
    if (!newColorStock) { toast.error('موجودی رنگ را وارد کن'); return; }
    if (colorsList.find(c => c.name === newColorName)) { toast.error('این رنگ قبلاً اضافه شده'); return; }
    setColorsList([...colorsList, { name: newColorName, stock: Number(newColorStock) || 0 }]);
    setNewColorName(''); setNewColorStock('');
  };
  const removeColor = (i) => setColorsList(colorsList.filter((_, idx) => idx !== i));
  const updateColorStock = (i, v) => { const l = [...colorsList]; l[i].stock = Number(v) || 0; setColorsList(l); };

  const addSize = () => {
    if (!newSizeName) { toast.error('سایز را وارد کن'); return; }
    if (!newSizeStock) { toast.error('موجودی سایز را وارد کن'); return; }
    if (sizesList.find(s => s.name === newSizeName)) { toast.error('این سایز قبلاً اضافه شده'); return; }
    setSizesList([...sizesList, { name: newSizeName, stock: Number(newSizeStock) || 0 }]);
    setNewSizeName(''); setNewSizeStock('');
  };
  const removeSize = (i) => setSizesList(sizesList.filter((_, idx) => idx !== i));
  const updateSizeStock = (i, v) => { const l = [...sizesList]; l[i].stock = Number(v) || 0; setSizesList(l); };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) { toast.error('عنوان الزامی است'); return; }
    if (!price) { toast.error('قیمت الزامی است'); return; }

    const colorsTotal = colorsList.reduce((sum, c) => sum + (Number(c.stock) || 0), 0);
    const sizesTotal = sizesList.reduce((sum, s) => sum + (Number(s.stock) || 0), 0);
    const stockNum = Number(stock) || 0;

    if (colorsList.length > 0 && colorsTotal !== stockNum && !sizesList.length) {
      toast.error(`تعداد را در رنگ و سایز و موجودی کنترل کنید`);
      return;
    }
    if (sizesList.length > 0 && sizesTotal !== stockNum && !colorsList.length) {
      toast.error(`تعداد را در رنگ و سایز و موجودی کنترل کنید`);
      return;
    }
    if (colorsList.length > 0 && sizesList.length > 0 && (colorsTotal !== sizesTotal || colorsTotal !== stockNum)) {
      toast.error('تعداد را در رنگ و سایز و موجودی کنترل کنید');
      return;
    }

    setCreating(true);
    try {
      const payload = {
        title: title.trim(), price, stock: stockNum || 1, condition,
        description: description.trim(), allow_courier: allowCourier,
        allow_local_test: allowTest, category: category === CATEGORIES[0] ? '' : category,
      };
      if (colorsList.length) { const o = {}; colorsList.forEach(c => o[c.name] = c.stock); payload.colors = o; }
      if (sizesList.length) { const o = {}; sizesList.forEach(s => o[s.name] = s.stock); payload.sizes = o; }

      await api.post(`/shops/${shopId}/products/`, payload);
      toast.success('محصول اضافه شد');
      setShowCreate(false);
      resetForm();
      fetchProducts();
    } catch (err) { toast.error('خطا در ایجاد محصول'); } finally { setCreating(false); }
  };

  const resetForm = () => {
    setTitle(''); setPrice(''); setPriceDisplay(''); setStock(''); setDescription('');
    setCategory(CATEGORIES[0]); setCondition('new'); setAllowCourier(false); setAllowTest(false);
    setColorsList([]); setSizesList([]); setNewColorName(''); setNewColorStock('');
    setNewSizeName(''); setNewSizeStock('');
  };

  const toggleVisibility = async (product) => {
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_visible: !p.is_visible } : p));
    try { await api.patch(`/shops/products/${product.id}/update/`, { is_visible: !product.is_visible }); } catch (err) {}
  };

  const sortedProducts = [...products].sort((a, b) => {
    const aLow = a.stock > 0 && a.stock <= Number(lowStockAlert);
    const bLow = b.stock > 0 && b.stock <= Number(lowStockAlert);
    return (aLow && !bLow) ? -1 : (!aLow && bLow) ? 1 : 0;
  });

  return (
    <div className="min-h-screen bg-[#fdf2f8]">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-pink-100">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-base font-bold bg-gradient-to-r from-pink-700 to-pink-500 bg-clip-text text-transparent">راسته بازار</Link>
          <Link to="/seller/shops" className="text-sm text-gray-500 hover:text-pink-600">← فروشگاه‌ها</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-extrabold text-gray-800"><Package className="text-pink-600 inline mr-2" size={22} />محصولات فروشگاه</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')} className="w-9 h-9 bg-white border rounded-xl flex items-center justify-center">
              {viewMode === 'list' ? <LayoutGrid size={16} /> : <List size={16} />}
            </button>
            <button onClick={() => setShowCreate(!showCreate)} className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5">
              <Plus size={18} /> محصول جدید
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showCreate && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-6">
              <form onSubmit={handleCreate} className="bg-white rounded-2xl p-6 border shadow-sm">
                <h2 className="font-bold text-gray-800 mb-4">افزودن محصول جدید</h2>
                <div className="space-y-4">
                  <div><label className="text-sm text-gray-600">عنوان <span className="text-red-500">*</span></label><input value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl text-sm mt-1" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-sm text-gray-600">قیمت (تومان) <span className="text-red-500">*</span></label><input type="text" value={priceDisplay || formatPrice(price)} onChange={handlePriceChange} onBlur={handlePriceBlur} dir="ltr" className="w-full px-4 py-2.5 border rounded-xl text-sm mt-1" />
{price && <p className="text-xs text-gray-500 mt-1">{numberToWords(Number(price))}</p>}</div>
                    <div><label className="text-sm text-gray-600">موجودی</label><input type="number" value={stock} onChange={e => setStock(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl text-sm mt-1" /></div>
                  </div>
                  <div><label className="text-sm text-gray-600 flex items-center gap-1"><AlertTriangle size={14} className="text-orange-500" /> هشدار اتمام موجودی</label><input type="number" value={lowStockAlert} onChange={e => setLowStockAlert(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl text-sm mt-1" /></div>
                  <div><label className="text-sm text-gray-600">توضیحات</label><textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full px-4 py-2.5 border rounded-xl text-sm mt-1 resize-none" /></div>
                  <div><label className="text-sm text-gray-600">دسته‌بندی</label><select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl text-sm mt-1">{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>

                  <div>
                    <label className="text-sm font-bold text-gray-700">🎨 رنگ‌بندی (اختیاری)</label>
                    {colorsList.map((c, i) => {
                      const ch = COLORS.find(col => col.name === c.name)?.hex;
                      return (
                        <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl p-2 mt-2">
                          {ch ? <div className="w-5 h-5 rounded-full border" style={{ backgroundColor: ch }} /> : <span className="text-xs">{c.name}</span>}
                          <span className="text-sm flex-1">{c.name}</span>
                          <input type="number" value={c.stock} onChange={e => updateColorStock(i, e.target.value)} className="w-20 px-2 py-1 border rounded-lg text-sm" />
                          <button onClick={() => removeColor(i)} className="text-red-500"><X size={16} /></button>
                        </div>
                      );
                    })}
                    <div className="relative flex gap-2 mt-2">
                      <input value={newColorName} onChange={e => { setNewColorName(e.target.value); setShowColorSuggestions(true); }} placeholder="نام رنگ..." className="flex-1 px-4 py-2 border rounded-xl text-sm" />
                      <input type="number" value={newColorStock} onChange={e => setNewColorStock(e.target.value)} placeholder="موجودی" className="w-20 px-2 py-2 border rounded-xl text-sm" />
                      <button onClick={addColor} className="bg-pink-600 text-white px-4 py-2 rounded-xl text-sm font-bold"><Plus size={16} /></button>
                    </div>
                    {showColorSuggestions && newColorName && filteredColors.length > 0 && (
                      <div className="absolute z-50 bg-white rounded-xl shadow-lg border max-h-40 overflow-y-auto w-40">
                        {filteredColors.map(c => (
                          <button key={c.name} type="button" onMouseDown={() => { setNewColorName(c.name); setShowColorSuggestions(false); }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-pink-50 text-sm"><div className="w-5 h-5 rounded-full border" style={{ backgroundColor: c.hex }} /><span>{c.name}</span></button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-bold text-gray-700">📐 سایزبندی (اختیاری)</label>
                    {sizesList.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl p-2 mt-2">
                        <span className="text-sm font-bold w-10">{s.name}</span>
                        <span className="text-sm flex-1">سایز {s.name}</span>
                        <input type="number" value={s.stock} onChange={e => updateSizeStock(i, e.target.value)} className="w-20 px-2 py-1 border rounded-lg text-sm" />
                        <button onClick={() => removeSize(i)} className="text-red-500"><X size={16} /></button>
                      </div>
                    ))}
                    <div className="flex gap-2 mt-2">
                      <input value={newSizeName} onChange={e => setNewSizeName(e.target.value)} placeholder="مثلاً: S" dir="ltr" className="flex-1 px-4 py-2 border rounded-xl text-sm" />
                      <input type="number" value={newSizeStock} onChange={e => setNewSizeStock(e.target.value)} placeholder="موجودی" className="w-20 px-2 py-2 border rounded-xl text-sm" />
                      <button onClick={addSize} className="bg-pink-600 text-white px-4 py-2 rounded-xl text-sm font-bold"><Plus size={16} /></button>
                    </div>
                  </div>

                  <div><label className="text-sm text-gray-600">وضعیت</label><select value={condition} onChange={e => setCondition(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl text-sm mt-1">{CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>

                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={allowCourier} onChange={e => setAllowCourier(e.target.checked)} className="w-5 h-5 rounded text-pink-600" /><Truck size={16} className="text-pink-600" /><span className="text-sm">ارسال با پیک</span></label>
                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={allowTest} onChange={e => setAllowTest(e.target.checked)} className="w-5 h-5 rounded text-green-600" /><Handshake size={16} className="text-green-600" /><span className="text-sm">تست حضوری</span></label>
                  </div>
                </div>

                <div className="flex gap-2 mt-6">
                  <button type="submit" disabled={creating} className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2"><Save size={16} /> {creating ? 'در حال ایجاد...' : 'افزودن محصول'}</button>
                  <button type="button" onClick={() => { setShowCreate(false); resetForm(); }} className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-6 py-2.5 rounded-xl text-sm font-bold">انصراف</button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? <div className="text-center py-10">در حال بارگذاری...</div> : products.length === 0 ? (
          <div className="text-center py-20"><div className="text-6xl mb-4">📦</div><h3 className="text-lg font-bold text-gray-700 mb-2">هنوز محصولی اضافه نکردی!</h3><button onClick={() => setShowCreate(true)} className="bg-pink-600 text-white px-6 py-3 rounded-xl font-bold mt-4"><Plus size={18} className="inline mr-1" />اولین محصول</button></div>
        ) : (
          <div className="space-y-3">
            {sortedProducts.map(product => {
              const isLowStock = product.stock > 0 && product.stock <= Number(lowStockAlert);
              const isOutOfStock = product.stock === 0;
              return (
                <motion.div key={product.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className={`bg-white rounded-2xl p-4 border flex items-center gap-4 ${isLowStock ? 'border-orange-400 animate-pulse' : isOutOfStock ? 'border-red-300 bg-red-50/50' : 'border-gray-100'}`}>
                  <div className="w-12 h-12 bg-pink-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">🛍️</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm truncate">{product.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-extrabold text-pink-600">{Number(product.price).toLocaleString('fa-IR')} تومان</span>
                      <span className="text-xs text-gray-400">| موجودی: {product.stock}</span>
                    </div>
                    {isLowStock && <p className="text-xs text-orange-600 mt-1">⚠️ فقط {product.stock} عدد دیگر موجود است</p>}
                    {isOutOfStock && <p className="text-xs text-red-600 mt-1">❌ اتمام موجودی</p>}
                  </div>
                  <Link to={`/seller/products/${product.id}/edit`} className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">✏️</Link>
                  <button onClick={() => toggleVisibility(product)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${product.is_visible ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                    {product.is_visible ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
