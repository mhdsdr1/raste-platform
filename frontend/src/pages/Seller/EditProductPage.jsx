import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package, Save, Plus, X, AlertTriangle, Truck, Handshake } from 'lucide-react';
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



export default function EditProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const triggerRefresh = useProductsStore(s => s.triggerRefresh);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [priceDisplay, setPriceDisplay] = useState('');

  const formatPrice = (val) => {
    const num = String(val).replace(/\D/g, '');
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const handlePriceChange = (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setPrice(raw);
    setPriceDisplay(formatPrice(raw));
  };

  const handlePriceBlur = () => {
    if (price) setPriceDisplay(formatPrice(price));
  };
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

  useEffect(() => {
    // ذخیره shopId برای بازگشت
    api.get(`/shops/products/${id}/`).then(res => {
      if (res.data.shop) localStorage.setItem('last_shop_id', res.data.shop);
    });
    api.get(`/shops/products/${id}/`)
      .then(res => {
        const p = res.data;
        setTitle(p.title || '');
        setPrice(p.price || '');
        setStock(p.stock || '');
        setDescription(p.description || '');
        setCategory(p.category || CATEGORIES[0]);
        setCondition(p.condition || 'new');
        setAllowCourier(p.allow_courier || false);
        setAllowTest(p.allow_local_test || false);
        if (p.colors && typeof p.colors === 'object') {
          setColorsList(Object.entries(p.colors).map(([name, s]) => ({ name, stock: s })));
        }
        if (p.sizes && typeof p.sizes === 'object') {
          setSizesList(Object.entries(p.sizes).map(([name, s]) => ({ name, stock: s })));
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

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
    if (!newSizeName) { toast.error('سایز را انتخاب کن'); return; }
    if (!newSizeStock) { toast.error('موجودی سایز را وارد کن'); return; }
    if (sizesList.find(s => s.name === newSizeName)) { toast.error('این سایز قبلاً اضافه شده'); return; }
    setSizesList([...sizesList, { name: newSizeName, stock: Number(newSizeStock) || 0 }]);
    setNewSizeName(''); setNewSizeStock('');
  };
  const removeSize = (i) => setSizesList(sizesList.filter((_, idx) => idx !== i));
  const updateSizeStock = (i, v) => { const l = [...sizesList]; l[i].stock = Number(v) || 0; setSizesList(l); };

  const handleSave = async () => {
    if (!title.trim()) { toast.error('عنوان الزامی است'); return; }
    if (!price) { toast.error('قیمت الزامی است'); return; }

    const colorsTotal = colorsList.reduce((sum, c) => sum + (Number(c.stock) || 0), 0);
    const sizesTotal = sizesList.reduce((sum, s) => sum + (Number(s.stock) || 0), 0);
    const stockNum = Number(stock) || 0;

    // اعتبارسنجی موجودی
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

    setSaving(true);
    try {
      const payload = {
        title: title.trim(), price, stock: Number(stock) || 0, condition, description,
        allow_courier: allowCourier, allow_local_test: allowTest,
        category: category === CATEGORIES[0] ? '' : category,
      };
      if (colorsList.length) {
        const o = {}; colorsList.forEach(c => o[c.name] = c.stock); payload.colors = o;
      }
      if (sizesList.length) {
        const o = {}; sizesList.forEach(s => o[s.name] = s.stock); payload.sizes = o;
      }
      await api.patch(`/shops/products/${id}/update/`, payload);
      localStorage.setItem('lowStockAlert', lowStockAlert);
      toast.success('محصول ویرایش شد');
      localStorage.setItem('product_updated', Date.now().toString());
      navigate(-1);
    } catch (err) { toast.error('خطا در ویرایش'); } finally { setSaving(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#fdf2f8]">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-pink-100">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-base font-bold bg-gradient-to-r from-pink-700 to-pink-500 bg-clip-text text-transparent">راسته بازار</Link>
          <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-pink-600">← بازگشت</button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl p-6 border shadow-sm">
          <h2 className="font-bold text-xl text-gray-800 mb-6"><Package className="inline mr-2 text-pink-600" size={22} />ویرایش محصول</h2>
          <div className="space-y-4">
            <div><label className="text-sm text-gray-600">عنوان <span className="text-red-500">*</span></label><input value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl text-sm mt-1" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm text-gray-600">قیمت (تومان) <span className="text-red-500">*</span></label><input type="text" value={priceDisplay || formatPrice(price)} onChange={handlePriceChange} onBlur={handlePriceBlur} className="w-full px-4 py-2.5 border rounded-xl text-sm mt-1" dir="ltr" /></div>
              <div><label className="text-sm text-gray-600">موجودی</label><input type="number" value={stock} onChange={e => setStock(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl text-sm mt-1" /></div>
            </div>
            <div><label className="text-sm text-gray-600 flex items-center gap-1"><AlertTriangle size={14} className="text-orange-500" /> هشدار اتمام موجودی</label><input type="number" value={lowStockAlert} onChange={e => setLowStockAlert(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl text-sm mt-1" /></div>
            <div><label className="text-sm text-gray-600">توضیحات</label><textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full px-4 py-2.5 border rounded-xl text-sm mt-1 resize-none" /></div>
            <div><label className="text-sm text-gray-600">دسته‌بندی</label><select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl text-sm mt-1">{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>

            {/* رنگ‌بندی */}
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

            {/* سایزبندی */}
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
                <input value={newSizeName} onChange={e => setNewSizeName(e.target.value)} placeholder="مثلاً: S یا 42" dir="ltr" className="flex-1 px-4 py-2 border rounded-xl text-sm" />
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

          <button onClick={handleSave} disabled={saving} className="w-full mt-6 bg-pink-600 hover:bg-pink-700 text-white py-3.5 rounded-2xl font-bold text-lg flex items-center justify-center gap-2"><Save size={20} /> {saving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}</button>
        </div>
      </main>
    </div>
  );
}
