import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Eye, EyeOff, Package, Truck, Handshake, LayoutGrid, List, Camera, X, AlertTriangle, Tag, Palette } from 'lucide-react';
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

export default function SellerProductsPage() {
  const { id: shopId } = useParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const fileInputRef = useRef(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('1');
  const [condition, setCondition] = useState('new');
  const [allowCourier, setAllowCourier] = useState(true);
  const [allowTest, setAllowTest] = useState(false);
  const [story, setStory] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [lowStockAlert, setLowStockAlert] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [colorInput, setColorInput] = useState('');
  const [selectedColor, setSelectedColor] = useState(null);
  const [showColorSuggestions, setShowColorSuggestions] = useState(false);

  const fetchProducts = async () => {
    try {
      const res = await api.get(`/shops/${shopId}/products/all/`);
      setProducts(res.data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchProducts(); }, [shopId]);

  const filteredColors = colorInput.length >= 1 ? COLORS.filter(c => c.name.includes(colorInput)) : [];
  const handleColorSelect = (color) => { setSelectedColor(color); setColorInput(color.name); setShowColorSuggestions(false); };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title || !price) { toast.error('عنوان و قیمت الزامی است'); return; }
    setCreating(true);
    try {
      const fd = new FormData();
      fd.append('title', title.trim()); fd.append('description', description.trim());
      fd.append('price', price); fd.append('stock', stock); fd.append('condition', condition);
      fd.append('allow_courier', allowCourier); fd.append('allow_local_test', allowTest);
      fd.append('story', story.trim());
      fd.append('category', customCategory || (category === DEFAULT_CATEGORIES[0] ? '' : category));
      fd.append('color', selectedColor ? selectedColor.name : '');
      if (image) fd.append('image', image);
      await api.post(`/shops/${shopId}/products/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('محصول اضافه شد'); setShowCreate(false); resetForm(); fetchProducts();
    } catch (err) { toast.error('خطا در ایجاد محصول'); } finally { setCreating(false); }
  };

  const [editingProduct, setEditingProduct] = useState(null);
  const [editColor, setEditColor] = useState("");

  const openEditModal = (product) => {
    setEditingProduct(product);
    setEditColor(product.color || "");
  };

  const saveEdit = async () => {
    if (!editingProduct) return;
    try {
      await api.patch(`/shops/products/${editingProduct.id}/update/`, { color: editColor });
      toast.success("محصول ویرایش شد");
      setEditingProduct(null);
      fetchProducts();
    } catch (err) { toast.error("خطا در ویرایش"); }
  };

  const toggleVisibility = async (product) => {
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_visible: !p.is_visible } : p));
    try { await api.patch(`/shops/products/${product.id}/update/`, { is_visible: !product.is_visible }); } catch (err) {}
  };

  const resetForm = () => {
    setTitle(''); setDescription(''); setPrice(''); setStock('1');
    setCondition('new'); setAllowCourier(true); setAllowTest(false);
    setStory(''); setImage(null); setImagePreview(null);
    setLowStockAlert(''); setCategory(DEFAULT_CATEGORIES[0]); setCustomCategory('');
    setColorInput(''); setSelectedColor(null);
  };

  const sortedProducts = [...products].sort((a, b) => {
    const aLow = lowStockAlert && a.stock > 0 && a.stock <= Number(lowStockAlert);
    const bLow = lowStockAlert && b.stock > 0 && b.stock <= Number(lowStockAlert);
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

        {/* CREATE FORM */}
        <AnimatePresence>
          {showCreate && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-6">
              <form onSubmit={handleCreate} className="bg-white rounded-2xl p-6 border shadow-sm">
                <h2 className="font-bold text-gray-800 mb-4">افزودن محصول جدید</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-sm text-gray-600">عنوان <span className="text-red-500">*</span></label>
                    <input value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl text-sm mt-1" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">قیمت (تومان) <span className="text-red-500">*</span></label>
                    <input type="number" value={price} onChange={e => setPrice(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl text-sm mt-1" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">موجودی</label>
                    <input type="number" value={stock} onChange={e => setStock(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl text-sm mt-1" />
                  </div>
                  
                  {/* رنگ‌بندی */}
                  <div className="relative">
                    <label className="text-sm text-gray-600 flex items-center gap-1"><Palette size={14} /> رنگ‌بندی</label>
                    <div className="flex items-center gap-2 mt-1">
                      <input value={colorInput} onChange={e => { setColorInput(e.target.value); setShowColorSuggestions(true); if (!e.target.value) setSelectedColor(null); }}
                        onFocus={() => setShowColorSuggestions(true)} onBlur={() => setTimeout(() => setShowColorSuggestions(false), 200)}
                        placeholder="مثلاً: قرمز" className="flex-1 px-4 py-2.5 border rounded-xl text-sm" />
                      {selectedColor && <div className="w-8 h-8 rounded-full border-2 border-gray-300 flex-shrink-0" style={{ backgroundColor: selectedColor.hex }} />}
                    </div>
                    {showColorSuggestions && colorInput.length >= 1 && filteredColors.length > 0 && (
                      <div className="absolute top-full mt-1 w-full bg-white rounded-xl shadow-lg border z-50 max-h-40 overflow-y-auto">
                        {filteredColors.map(color => (
                          <button key={color.name} type="button" onMouseDown={() => handleColorSelect(color)}
                            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-pink-50 text-sm">
                            <div className="w-6 h-6 rounded-full border" style={{ backgroundColor: color.hex }} /><span>{color.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-sm text-gray-600">دسته‌بندی</label>
                    <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl text-sm mt-1">
                      {DEFAULT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {category === '✏️ دسته‌بندی جدید...' && (
                      <input value={customCategory} onChange={e => setCustomCategory(e.target.value)} placeholder="نام دسته جدید" className="w-full px-4 py-2.5 border rounded-xl text-sm mt-2" />
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">وضعیت</label>
                    <select value={condition} onChange={e => setCondition(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl text-sm mt-1">
                      {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 flex items-center gap-1"><AlertTriangle size={14} className="text-orange-500" /> هشدار موجودی</label>
                    <input type="number" value={lowStockAlert} onChange={e => setLowStockAlert(e.target.value)} placeholder="مثلاً ۵" className="w-full px-4 py-2.5 border rounded-xl text-sm mt-1" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 mb-2">امکانات</label>
                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                      <input type="checkbox" checked={allowCourier} onChange={e => setAllowCourier(e.target.checked)} className="w-5 h-5 rounded text-pink-600" />
                      <Truck size={16} className="text-pink-600" /> <span className="text-sm">ارسال با پیک</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={allowTest} onChange={e => setAllowTest(e.target.checked)} className="w-5 h-5 rounded text-green-600" />
                      <Handshake size={16} className="text-green-600" /> <span className="text-sm">تست حضوری</span>
                    </label>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm text-gray-600">توضیحات</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full px-4 py-2.5 border rounded-xl text-sm mt-1 resize-none" placeholder="اختیاری" />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button type="submit" disabled={creating} className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold">{creating ? 'در حال ایجاد...' : 'افزودن محصول'}</button>
                  <button type="button" onClick={() => { setShowCreate(false); resetForm(); }} className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-6 py-2.5 rounded-xl text-sm font-bold">انصراف</button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PRODUCT LIST */}
        {loading ? <div className="text-center py-10">در حال بارگذاری...</div> : products.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-lg font-bold text-gray-700 mb-2">هنوز محصولی اضافه نکردی!</h3>
            <button onClick={() => setShowCreate(true)} className="bg-pink-600 text-white px-6 py-3 rounded-xl font-bold mt-4"><Plus size={18} className="inline mr-1" />اولین محصول</button>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedProducts.map(product => {
              const isLowStock = lowStockAlert && product.stock > 0 && product.stock <= Number(lowStockAlert);
              const isOutOfStock = product.stock === 0;
              const colorHex = COLORS.find(c => c.name === product.color)?.hex;
              return (
                <motion.div key={product.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className={`bg-white rounded-2xl p-4 border flex items-center gap-4 ${isLowStock ? 'border-orange-400 animate-pulse' : isOutOfStock ? 'border-red-300 bg-red-50/50' : 'border-gray-100'}`}>
                  <div className="w-12 h-12 bg-pink-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                    {product.image ? <img src={product.image} className="w-full h-full object-cover rounded-xl" /> : '🛍️'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm truncate">{product.title}</h3>
                      {colorHex && <div className="w-5 h-5 rounded-full border border-gray-300 flex-shrink-0" style={{ backgroundColor: colorHex }} title={product.color} />}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-extrabold text-pink-600">{Number(product.price).toLocaleString('fa-IR')} تومان</span>
                      <span className="text-xs text-gray-400">| موجودی: {product.stock}</span>
                    </div>
                    {isLowStock && <p className="text-xs text-orange-600 mt-1">⚠️ فقط {product.stock} عدد دیگر موجود است</p>}
                    {isOutOfStock && <p className="text-xs text-red-600 mt-1">❌ اتمام موجودی</p>}
                  </div>
                  <Link to={`/seller/products/${product.id}/edit`} className="w-9 h-9 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl flex items-center justify-center transition-all" title="ویرایش محصول">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </Link>
                  <button onClick={() => toggleVisibility(product)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${product.is_visible ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                    {product.is_visible ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      {/* Edit Modal */}
      <AnimatePresence>
        {editingProduct && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditingProduct(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-lg mb-4">ویرایش {editingProduct.title}</h3>
              <label className="text-sm text-gray-600">رنگ</label>
              <input value={editColor} onChange={e => setEditColor(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl text-sm mt-1 mb-4" />
              <div className="flex gap-2">
                <button onClick={saveEdit} className="flex-1 bg-pink-600 text-white py-2.5 rounded-xl font-bold text-sm">ذخیره</button>
                <button onClick={() => setEditingProduct(null)} className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-xl font-bold text-sm">انصراف</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </main>
    </div>
  );
}
