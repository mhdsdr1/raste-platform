import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Eye, EyeOff, Package, Truck, Handshake, LayoutGrid, List, X, AlertTriangle, Save, Camera, ChevronDown, ChevronUp, Palette, Tag } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'sonner';

const CONDITIONS = [
  { value: 'new', label: '🟢 نو' }, { value: 'like_new', label: '🔵 در حد نو' },
  { value: 'used', label: '🟠 کارکرده' }, { value: 'needs_repair', label: '🔴 نیاز به تعمیر' },
];

const CATEGORIES = [
  'انتخاب دسته‌بندی...', '📱 موبایل و تبلت', '💻 لپ‌تاپ و کامپیوتر', '👗 پوشاک',
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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [shopInfo, setShopInfo] = useState(null);

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [priceDisplay, setPriceDisplay] = useState('');
  const [stock, setStock] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchasePriceDisplay, setPurchasePriceDisplay] = useState('');
  const [warehouseStock, setWarehouseStock] = useState('0');
  const [lowStockAlert, setLowStockAlert] = useState('3');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [condition, setCondition] = useState('new');
  const [allowCourier, setAllowCourier] = useState(false);
  const [allowTest, setAllowTest] = useState(false);

  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

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

  useEffect(() => { fetchProducts(); }, [shopId]);
  useEffect(() => {
    api.get(`/shops/${shopId}/`).then(res => setShopInfo(res.data)).catch(() => {});
  }, [shopId]);

  const formatPrice = (val) => {
    const num = String(val).replace(/\D/g, '');
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const handlePriceChange = (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setPrice(raw); setPriceDisplay(formatPrice(raw));
  };

  const handlePurchasePriceChange = (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setPurchasePrice(raw); setPurchasePriceDisplay(formatPrice(raw));
  };

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

  const handleImageChange = (e) => {
    const f = e.target.files?.[0];
    if (f) { setImage(f); setImagePreview(URL.createObjectURL(f)); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) { toast.error('عنوان الزامی است'); return; }
    if (!price) { toast.error('قیمت الزامی است'); return; }

    // اعتبارسنجی رنگ/سایز با موجودی
    const colorsTotal = colorsList.reduce((sum, c) => sum + (Number(c.stock) || 0), 0);
    const sizesTotal = sizesList.reduce((sum, s) => sum + (Number(s.stock) || 0), 0);
    const stockNum = Number(stock) || 0;
    
    if (colorsList.length > 0 && sizesList.length > 0) {
      if (colorsTotal !== sizesTotal || colorsTotal !== stockNum) {
        toast.error('جمع رنگ‌ها، سایزها و موجودی سایت باید برابر باشند');
        return;
      }
    } else if (colorsList.length > 0 && colorsTotal !== stockNum) {
      toast.error(`جمع موجودی رنگ‌ها (${colorsTotal}) با موجودی سایت (${stockNum}) برابر نیست`);
      return;
    } else if (sizesList.length > 0 && sizesTotal !== stockNum) {
      toast.error(`جمع موجودی سایزها (${sizesTotal}) با موجودی سایت (${stockNum}) برابر نیست`);
      return;
    }

    setCreating(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('price', price);
      formData.append('stock', stock || 0);
      if (purchasePrice) formData.append('purchase_price', purchasePrice);
      formData.append('warehouse_stock', warehouseStock || 0);
      formData.append('condition', condition);
      formData.append('description', description.trim());
      formData.append('allow_courier', allowCourier);
      formData.append('allow_local_test', allowTest);
      formData.append('category', category === CATEGORIES[0] ? '' : category);
      if (colorsList.length) { const o = {}; colorsList.forEach(c => o[c.name] = c.stock); formData.append('colors', JSON.stringify(o)); }
      if (sizesList.length) { const o = {}; sizesList.forEach(s => o[s.name] = s.stock); formData.append('sizes', JSON.stringify(o)); }
      if (image) formData.append('image', image);

      await api.post(`/shops/${shopId}/products/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('محصول اضافه شد');
      setShowCreate(false);
      resetForm();
      fetchProducts();
    } catch (err) { toast.error('خطا در ایجاد محصول'); } finally { setCreating(false); }
  };

  const resetForm = () => {
    setTitle(''); setPrice(''); setPriceDisplay(''); setStock('');
    setPurchasePrice(''); setPurchasePriceDisplay(''); setWarehouseStock('0');
    setDescription(''); setCategory(CATEGORIES[0]); setCondition('new');
    setAllowCourier(false); setAllowTest(false);
    setColorsList([]); setSizesList([]);
    setImage(null); setImagePreview(null);
    setShowAdvanced(false);
  };

  const toggleVisibility = async (product) => {
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_visible: !p.is_visible } : p));
    try { await api.patch(`/shops/products/${product.id}/update/`, { is_visible: !product.is_visible }); } catch (err) {}
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`آیا از حذف «${product.title}» مطمئن هستید؟`)) return;
    try {
      await api.delete(`/shops/products/${product.id}/delete/`);
      toast.success('محصول حذف شد');
      fetchProducts();
    } catch (err) { toast.error('خطا در حذف محصول'); }
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
          <h1 className="text-xl font-extrabold text-gray-800"><Package className="text-pink-600 inline mr-2" size={22} />{shopInfo?.name || "محصولات فروشگاه"}</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')} className="w-9 h-9 bg-white border rounded-xl flex items-center justify-center">
              {viewMode === 'list' ? <LayoutGrid size={16} /> : <List size={16} />}
            </button>
            <button onClick={() => setShowCreate(!showCreate)} className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5">
              <Plus size={18} /> محصول جدید
            </button>
          </div>
        </div>

        {/* ========== CREATE FORM ========== */}
        <AnimatePresence>
          {showCreate && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-6">
              <form onSubmit={handleCreate} className="bg-white rounded-2xl p-6 border shadow-sm">
                <div className="flex items-center justify-between mb-4"><h2 className="font-bold text-gray-800">ایجاد محصول برای {shopInfo?.name || "فروشگاه"}</h2></div>

                {/* عکس بالا */}
                <div className="flex justify-center mb-6">
                  <div className="text-center">
                    <button type="button" onClick={() => document.getElementById('createProductImage').click()}
                      className="w-24 h-24 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 hover:border-pink-400 transition-all overflow-hidden">
                      {imagePreview ? <img src={imagePreview} className="w-full h-full object-cover rounded-2xl" /> : <><Camera size={28} className="text-gray-400" /><span className="text-[10px] text-gray-400">عکس</span></>}
                    </button>
                    {imagePreview && <button type="button" onClick={() => { setImage(null); setImagePreview(null); }} className="block mx-auto mt-2 text-xs text-red-500">حذف عکس</button>}
                    <input id="createProductImage" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  </div>
                </div>

                <div className="space-y-4">
                  <div><label className="text-sm text-gray-600">نام محصول <span className="text-red-500">*</span></label><input value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl text-sm mt-1" /></div>
                  <div><label className="text-sm text-gray-600">قیمت فروش (تومان) <span className="text-red-500">*</span></label><input type="text" value={priceDisplay} onChange={handlePriceChange} dir="ltr" className="w-full px-4 py-2.5 border rounded-xl text-sm mt-1" /></div>
                  <div><label className="text-sm text-gray-600">موجودی روی سایت</label><input type="number" value={stock} onChange={e => setStock(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl text-sm mt-1" /></div>
                </div>

                {/* دکمه پیشرفته */}
                <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-pink-600 mt-4 py-2">
                  {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  توضیحات بیشتر محصول
                </button>
                <div className="border-t border-gray-100 mb-4" />

                {/* فیلدهای پیشرفته */}
                <AnimatePresence>
                  {showAdvanced && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="space-y-4">
                        <div><label className="text-sm text-gray-600">💰 قیمت خرید (تومان)</label><input type="text" value={purchasePriceDisplay} onChange={handlePurchasePriceChange} dir="ltr" className="w-full px-4 py-2.5 border rounded-xl text-sm mt-1" /></div>
                        <div><label className="text-sm text-gray-600">📦 موجودی انبار</label><input type="number" value={warehouseStock} onChange={e => setWarehouseStock(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl text-sm mt-1" /></div>
                        <div><label className="text-sm text-gray-600">📝 توضیحات محصول</label><textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full px-4 py-2.5 border rounded-xl text-sm mt-1 resize-none" /></div>
                        <div><label className="text-sm text-gray-600">📂 دسته‌بندی</label><select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl text-sm mt-1">{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                        <div><label className="text-sm text-gray-600">📦 وضعیت کالا</label><select value={condition} onChange={e => setCondition(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl text-sm mt-1">{CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
                        <div><label className="text-sm text-gray-600 flex items-center gap-1"><AlertTriangle size={14} className="text-orange-500" /> هشدار اتمام موجودی</label><input type="number" value={lowStockAlert} onChange={e => setLowStockAlert(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl text-sm mt-1" /></div>

                        {/* رنگ‌بندی */}
                        <div>
                          <label className="text-sm font-bold text-gray-700 flex items-center gap-1"><Palette size={14} /> رنگ‌بندی</label>
                          {colorsList.map((c, i) => {
                            const ch = COLORS.find(col => col.name === c.name)?.hex;
                            return (
                              <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl p-2 mt-2">
                                {ch ? <div className="w-5 h-5 rounded-full border" style={{ backgroundColor: ch }} /> : <span className="text-xs">{c.name}</span>}
                                <span className="text-sm flex-1">{c.name}</span>
                                <input type="number" value={c.stock} onChange={e => updateColorStock(i, e.target.value)} className="w-20 px-2 py-1 border rounded-lg text-sm" />
                                <button type="button" onClick={() => removeColor(i)} className="text-red-500"><X size={16} /></button>
                              </div>
                            );
                          })}
                          <div className="flex gap-2 mt-2">
                            <input value={newColorName} onChange={e => { setNewColorName(e.target.value); setShowColorSuggestions(true); }} placeholder="نام رنگ" className="flex-1 px-4 py-2 border rounded-xl text-sm" />
                            <input type="number" value={newColorStock} onChange={e => setNewColorStock(e.target.value)} placeholder="موجودی" className="w-20 px-2 py-2 border rounded-xl text-sm" />
                            <button type="button" onClick={addColor} className="bg-pink-600 text-white px-3 py-2 rounded-xl text-sm font-bold"><Plus size={16} /></button>
                          </div>
                          {showColorSuggestions && newColorName && filteredColors.length > 0 && (
                            <div className="bg-white rounded-xl shadow-lg border max-h-40 overflow-y-auto mt-1">
                              {filteredColors.map(c => (
                                <button key={c.name} type="button" onMouseDown={() => { setNewColorName(c.name); setShowColorSuggestions(false); }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-pink-50 text-sm"><div className="w-5 h-5 rounded-full border" style={{ backgroundColor: c.hex }} /><span>{c.name}</span></button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* سایزبندی */}
                        <div>
                          <label className="text-sm font-bold text-gray-700">📐 سایزبندی</label>
                          {sizesList.map((s, i) => (
                            <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl p-2 mt-2">
                              <span className="text-sm font-bold w-10">{s.name}</span>
                              <span className="text-sm flex-1">سایز {s.name}</span>
                              <input type="number" value={s.stock} onChange={e => updateSizeStock(i, e.target.value)} className="w-20 px-2 py-1 border rounded-lg text-sm" />
                              <button type="button" onClick={() => removeSize(i)} className="text-red-500"><X size={16} /></button>
                            </div>
                          ))}
                          <div className="flex gap-2 mt-2">
                            <input value={newSizeName} onChange={e => setNewSizeName(e.target.value)} placeholder="سایز" dir="ltr" className="flex-1 px-4 py-2 border rounded-xl text-sm" />
                            <input type="number" value={newSizeStock} onChange={e => setNewSizeStock(e.target.value)} placeholder="موجودی" className="w-20 px-2 py-2 border rounded-xl text-sm" />
                            <button type="button" onClick={addSize} className="bg-pink-600 text-white px-3 py-2 rounded-xl text-sm font-bold"><Plus size={16} /></button>
                          </div>
                        </div>

                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={allowCourier} onChange={e => setAllowCourier(e.target.checked)} className="w-5 h-5 rounded text-pink-600" /><Truck size={16} className="text-pink-600" /><span className="text-sm">ارسال با پیک</span></label>
                          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={allowTest} onChange={e => setAllowTest(e.target.checked)} className="w-5 h-5 rounded text-green-600" /><Handshake size={16} className="text-green-600" /><span className="text-sm">تست حضوری</span></label>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex gap-2 mt-6">
                  <button type="submit" disabled={creating} className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2"><Save size={16} /> {creating ? 'در حال ایجاد...' : 'افزودن محصول'}</button>
                  <button type="button" onClick={() => { setShowCreate(false); resetForm(); }} className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-6 py-2.5 rounded-xl text-sm font-bold">انصراف</button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* لیست محصولات */}
        {loading ? <div className="text-center py-10">در حال بارگذاری...</div> : products.length === 0 ? (
          <div className="text-center py-20"><div className="text-6xl mb-4">📦</div><h3 className="text-lg font-bold text-gray-700 mb-2">هنوز محصولی اضافه نکردی!</h3><button onClick={() => setShowCreate(true)} className="bg-pink-600 text-white px-6 py-3 rounded-xl font-bold mt-4"><Plus size={18} className="inline mr-1" />اولین محصول</button></div>
        ) : viewMode === 'list' ? (
          <div className="space-y-3">
            {sortedProducts.map(product => {
              const isLowStock = product.stock > 0 && product.stock <= Number(lowStockAlert);
              const isOutOfStock = product.stock === 0;
              return (
                <motion.div key={product.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className={`bg-white rounded-2xl p-4 border flex items-center gap-4 ${isLowStock ? 'border-orange-400 animate-pulse' : isOutOfStock ? 'border-red-300 bg-red-50/50' : 'border-gray-100'}`}>
                  <div className="w-12 h-12 bg-pink-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0 overflow-hidden">{product.image_url ? <img src={product.image_url} alt="" className="w-full h-full object-cover" /> : '🛍️'}</div>
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
                  <button onClick={() => handleDelete(product)} className="w-9 h-9 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">🗑️</button>
                  <button onClick={() => toggleVisibility(product)} className={`w-9 h-9 rounded-xl flex items-center justify-center ${product.is_visible ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                    {product.is_visible ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {sortedProducts.map(product => {
              const isLowStock = product.stock > 0 && product.stock <= Number(lowStockAlert);
              const isOutOfStock = product.stock === 0;
              return (
                <div key={product.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${isLowStock ? 'border-orange-400' : isOutOfStock ? 'border-red-300' : 'border-gray-100'}`}>
                  <div className="aspect-square bg-pink-50 flex items-center justify-center text-3xl">
                    {product.image_url ? <img src={product.image_url} alt="" className="w-full h-full object-cover" /> : '🛍️'}
                  </div>
                  <div className="p-3">
                    <h3 className="font-bold text-sm truncate">{product.title}</h3>
                    <p className="text-sm font-extrabold text-pink-600 mt-1">{Number(product.price).toLocaleString('fa-IR')} تومان</p>
                    <p className="text-xs text-gray-400 mt-0.5">موجودی: {product.stock}</p>
                    <div className="flex gap-1 mt-2">
                      <Link to={`/seller/products/${product.id}/edit`} className="flex-1 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold text-center">✏️</Link>
                      <button onClick={() => handleDelete(product)} className="flex-1 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold">🗑️</button>
                      <button onClick={() => toggleVisibility(product)} className={`flex-1 py-1.5 rounded-lg text-xs ${product.is_visible ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                        {product.is_visible ? '👁️' : '🙈'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
