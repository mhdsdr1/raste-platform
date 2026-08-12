import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package, Save, Camera, X, Truck, Handshake, AlertTriangle, Palette, Tag } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'sonner';

const CONDITIONS = [
  { value: 'new', label: '🟢 نو' }, { value: 'like_new', label: '🔵 در حد نو' },
  { value: 'used', label: '🟠 کارکرده' }, { value: 'needs_repair', label: '🔴 نیاز به تعمیر' },
];

const DEFAULT_CATEGORIES = [
  'انتخاب دسته‌بندی...', '📱 موبایل و تبلت', '💻 لپتاپ و کامپیوتر', '👗 پوشاک',
  '👟 کفش و کیف', '🍔 خوراکی', '🏠 لوازم خانگی', '📚 کتاب و لوازم التحریر',
  '💄 آرایشی و بهداشتی', '🧸 اسباب بازی', '⚽ ورزشی', '🚗 خودرو', '🏪 سایر', '✏️ دسته‌بندی جدید...',
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
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('1');
  const [condition, setCondition] = useState('new');
  const [allowCourier, setAllowCourier] = useState(false);
  const [allowTest, setAllowTest] = useState(false);
  const [story, setStory] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [colorInput, setColorInput] = useState('');
  const [selectedColor, setSelectedColor] = useState(null);
  const [showColorSuggestions, setShowColorSuggestions] = useState(false);
  const [lowStockAlert, setLowStockAlert] = useState(localStorage.getItem('lowStockAlert') || '3');

  useEffect(() => {
    api.get(`/shops/products/${id}/`)
      .then(res => {
        const p = res.data;
        setTitle(p.title || '');
        setDescription(p.description || '');
        setPrice(p.price || '');
        setStock(p.stock || '1');
        setCondition(p.condition || 'new');
        setAllowCourier(p.allow_courier || false);
        setAllowTest(p.allow_local_test || false);
        if (p.category) { setCategory(p.category); }
        setStory(p.story || '');
        setColorInput(p.color || '');
        if (p.color) {
          const found = COLORS.find(c => c.name === p.color);
          if (found) setSelectedColor(found);
        }
        if (p.image) setImagePreview(p.image);
        // category رو از API نمی‌گیریم چون توی ProductSerializer نیست
      })
      .catch(() => toast.error('محصول یافت نشد'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { toast.error('حداکثر ۲ مگابایت'); return; }
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const filteredColors = colorInput.length >= 1 ? COLORS.filter(c => c.name.includes(colorInput)) : [];
  const handleColorSelect = (color) => { setSelectedColor(color); setColorInput(color.name); setShowColorSuggestions(false); };

  const handleSave = async () => {
    if (!title || !price) { toast.error('عنوان و قیمت الزامی است'); return; }
    setSaving(true);
    try {
      await api.patch(`/shops/products/${id}/update/`, {
        title: title.trim(),
        description: description.trim(),
        price: price,
        stock: stock,
        condition: condition,
        color: selectedColor ? selectedColor.name : colorInput,
        allow_courier: allowCourier,
        allow_local_test: allowTest,
        story: story.trim(),
        category: customCategory || (category === DEFAULT_CATEGORIES[0] ? '' : category),
      });
      localStorage.setItem('lowStockAlert', lowStockAlert);
      toast.success('محصول ویرایش شد');
      navigate(-1);
    } catch (err) {
      console.error('Save error:', err.response?.data || err);
      toast.error('خطا در ویرایش');
    } finally { setSaving(false); }
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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-6 border shadow-sm">
          <h2 className="font-bold text-xl text-gray-800 mb-6"><Package className="text-pink-600 inline mr-2" size={22} />ویرایش محصول</h2>

          <div className="space-y-4">
            {/* عکس */}
            <div>
              <label className="text-sm text-gray-600 mb-2 block">عکس محصول</label>
              <div className="flex items-center gap-4">
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="w-24 h-24 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 hover:border-pink-400">
                  {imagePreview ? <img src={imagePreview} className="w-full h-full object-cover rounded-2xl" /> : <><Camera size={24} className="text-gray-400" /><span className="text-[10px] text-gray-400">عکس</span></>}
                </button>
                {imagePreview && <button onClick={() => { setImage(null); setImagePreview(null); }} className="text-red-500"><X size={20} /></button>}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-600">عنوان <span className="text-red-500">*</span></label>
              <input value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl text-sm mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm text-gray-600">قیمت (تومان) <span className="text-red-500">*</span></label><input type="number" value={price} onChange={e => setPrice(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl text-sm mt-1" /></div>
              <div><label className="text-sm text-gray-600">موجودی</label><input type="number" value={stock} onChange={e => setStock(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl text-sm mt-1" /></div>
            </div>

            {/* رنگ */}
            <div className="relative">
              <label className="text-sm text-gray-600 flex items-center gap-1"><Palette size={14} /> رنگ‌بندی</label>
              <div className="flex items-center gap-2 mt-1">
                <input value={colorInput} onChange={e => { setColorInput(e.target.value); setShowColorSuggestions(true); if (!e.target.value) setSelectedColor(null); }}
                  onFocus={() => setShowColorSuggestions(true)} onBlur={() => setTimeout(() => setShowColorSuggestions(false), 200)}
                  placeholder="مثلاً: قرمز" className="flex-1 px-4 py-2.5 border rounded-xl text-sm" />
                {selectedColor && <div className="w-8 h-8 rounded-full border-2 border-gray-300" style={{ backgroundColor: selectedColor.hex }} />}
              </div>
              {showColorSuggestions && colorInput.length >= 1 && filteredColors.length > 0 && (
                <div className="absolute top-full mt-1 w-full bg-white rounded-xl shadow-lg border z-50 max-h-40 overflow-y-auto">
                  {filteredColors.map(c => (
                    <button key={c.name} type="button" onMouseDown={() => handleColorSelect(c)} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-pink-50 text-sm">
                      <div className="w-6 h-6 rounded-full border" style={{ backgroundColor: c.hex }} /><span>{c.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* دسته‌بندی */}
            <div>
              <label className="text-sm text-gray-600 flex items-center gap-1"><Tag size={14} /> دسته‌بندی</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl text-sm mt-1">
                {DEFAULT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {category === '✏️ دسته‌بندی جدید...' && <input value={customCategory} onChange={e => setCustomCategory(e.target.value)} placeholder="نام دسته جدید" className="w-full px-4 py-2.5 border rounded-xl text-sm mt-2" />}
            </div>

            <div>
              <label className="text-sm text-gray-600">وضعیت</label>
              <select value={condition} onChange={e => setCondition(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl text-sm mt-1">
                {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-600 flex items-center gap-1"><AlertTriangle size={14} className="text-orange-500" /> هشدار موجودی</label>
              <input type="number" value={lowStockAlert} onChange={e => setLowStockAlert(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl text-sm mt-1" />
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={allowCourier} onChange={e => setAllowCourier(e.target.checked)} className="w-5 h-5 rounded text-pink-600" /><span className="text-sm">ارسال با پیک</span></label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={allowTest} onChange={e => setAllowTest(e.target.checked)} className="w-5 h-5 rounded text-green-600" /><span className="text-sm">تست حضوری</span></label>
            </div>

            <div>
              <label className="text-sm text-gray-600">توضیحات</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full px-4 py-2.5 border rounded-xl text-sm mt-1 resize-none" />
            </div>
          </div>

          <button onClick={handleSave} disabled={saving} className="w-full mt-6 bg-pink-600 hover:bg-pink-700 text-white py-3.5 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all">
            <Save size={20} /> {saving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
          </button>
        </motion.div>
      </main>
    </div>
  );
}
