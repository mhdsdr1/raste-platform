import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Trash2, Edit3, Calendar } from 'lucide-react';
import * as jalaali from 'jalaali-js';
import api from '../../services/api';
import { toast } from 'sonner';

const PRESET_EXPENSES = [
  { icon: '🚚', title: 'کرایه' },
  { icon: '📱', title: 'تبلیغات' },
  { icon: '📦', title: 'بسته‌بندی' },
  { icon: '🏠', title: 'اجاره' },
  { icon: '✏️', title: 'سایر' },
];

// تبدیل میلادی به شمسی
const toPersian = (gregorianDate) => {
  if (!gregorianDate) return '';
  try {
    const d = new Date(gregorianDate);
    if (isNaN(d.getTime())) return '';
    const { jy, jm, jd } = jalaali.toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
  } catch (e) { return ''; }
};

// تبدیل شمسی به میلادی
const toGregorian = (persianDate) => {
  if (!persianDate) return '';
  try {
    const parts = persianDate.split('/');
    if (parts.length !== 3) return '';
    const jy = parseInt(parts[0]);
    const jm = parseInt(parts[1]);
    const jd = parseInt(parts[2]);
    const { gy, gm, gd } = jalaali.toGregorian(jy, jm, jd);
    return `${gy}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}`;
  } catch (e) { return ''; }
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState('✏️');
  const [amount, setAmount] = useState('');
  const [amountDisplay, setAmountDisplay] = useState('');
  const [persianDate, setPersianDate] = useState('');
  const [shops, setShops] = useState([]);
  const [selectedShopId, setSelectedShopId] = useState('');
  const [searchParams] = useSearchParams();
  const [selectedShop] = useState(searchParams.get('shop') || 'all');
  const [notes, setNotes] = useState('');

  // انتخابگر تاریخ شمسی
  const [showPicker, setShowPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(1405);
  const [pickerMonth, setPickerMonth] = useState(1);

  const persianMonths = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

  // گرفتن روزهای ماه شمسی
  const getDaysInMonth = (jy, jm) => {
    return jalaali.jalaaliMonthLength(jy, jm);
  };

  const fetchExpenses = async () => {
    try {
      const params = selectedShop !== 'all' ? `?shop_id=${selectedShop}` : '';
      const res = await api.get(`/shops/expenses/${params}`);
      setExpenses(res.data.expenses || []);
      setTotal(res.data.total || 0);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { 
    fetchExpenses(); 
    api.get('/shops/my/').then(r => setShops(r.data || [])).catch(() => {});
  }, [selectedShop]);

  const formatPrice = (val) => {
    const num = String(val).replace(/\D/g, '');
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const handleAmountChange = (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setAmount(raw); setAmountDisplay(formatPrice(raw));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !amount) { toast.error('عنوان و مبلغ الزامی است'); return; }

    const gregorianDate = toGregorian(persianDate) || new Date().toISOString().split('T')[0];

    try {
      const payload = {
        title, icon, amount, expense_date: gregorianDate, notes
      };
      if (selectedShop && selectedShop !== 'all') payload.shop = selectedShop;
      
      if (editingId) {
        await api.patch(`/shops/expenses/${editingId}/`, payload);
        toast.success('هزینه ویرایش شد');
      } else {
        await api.post('/shops/expenses/create/', payload);
        toast.success('هزینه ثبت شد');
      }
      setShowForm(false);
      setEditingId(null);
      resetForm();
      fetchExpenses();
    } catch (err) { toast.error('خطا'); }
  };

  const resetForm = () => {
    setTitle(''); setIcon('✏️'); setAmount(''); setAmountDisplay('');
    setPersianDate(''); setNotes('');
  };

  const handleEdit = (expense) => {
    setEditingId(expense.id);
    setTitle(expense.title);
    setIcon(expense.icon || '✏️');
    setAmount(expense.amount);
    setAmountDisplay(formatPrice(expense.amount));
    setPersianDate(toPersian(expense.expense_date));
    setNotes(expense.notes || '');
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('حذف شود؟')) return;
    try {
      await api.delete(`/shops/expenses/${id}/delete/`);
      toast.success('حذف شد');
      fetchExpenses();
    } catch (err) { toast.error('خطا'); }
  };

  const selectPreset = (preset) => {
    setTitle(preset.title);
    setIcon(preset.icon);
  };

  // انتخاب روز از تقویم
  const selectDay = (day) => {
    const dateStr = `${pickerYear}/${String(pickerMonth).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
    setPersianDate(dateStr);
    setShowPicker(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin" /></div>;

  const daysInMonth = getDaysInMonth(pickerYear, pickerMonth);

  return (
    <div className="min-h-screen bg-[#fdf2f8]">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-pink-100">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-base font-bold bg-gradient-to-r from-pink-700 to-pink-500 bg-clip-text text-transparent">راسته بازار</Link>
          <Link to="/seller/analytics" className="text-sm text-gray-500 hover:text-pink-600">← داشبورد مالی</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-extrabold text-gray-800">
            ⚙️ مدیریت {selectedShop === 'all' 
              ? 'هزینه‌های جانبی' 
              : `هزینه‌های ${shops.find(s => String(s.id) === String(selectedShop))?.name || ''}`}
          </h1>
          <button onClick={() => { setShowForm(!showForm); setEditingId(null); resetForm(); }} className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5">
            <Plus size={18} /> افزودن هزینه
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 border shadow-sm mb-4">
            <h3 className="font-bold mb-4">
              {editingId ? 'ویرایش هزینه' : 'افزودن هزینه'}
            </h3>

            <div className="flex gap-2 flex-wrap mb-4">
              {PRESET_EXPENSES.map(p => (
                <button key={p.title} type="button" onClick={() => selectPreset(p)}
                  className={`px-3 py-2 rounded-xl text-sm border ${title === p.title ? 'bg-pink-100 border-pink-400 text-pink-700' : 'bg-gray-50 hover:bg-gray-100'}`}>
                  {p.icon} {p.title}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <div><label className="text-sm text-gray-600">عنوان</label><input value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl text-sm mt-1" /></div>
              <div><label className="text-sm text-gray-600">مبلغ (تومان)</label><input type="text" value={amountDisplay} onChange={handleAmountChange} dir="ltr" className="w-full px-4 py-2.5 border rounded-xl text-sm mt-1" /></div>
              <div className="relative">
                <label className="text-sm text-gray-600 flex items-center gap-1"><Calendar size={14} /> تاریخ</label>
                <button type="button" onClick={() => setShowPicker(!showPicker)}
                  className="w-full px-4 py-2.5 border rounded-xl text-sm mt-1 text-right bg-white hover:border-pink-300">
                  {persianDate || 'انتخاب تاریخ'}
                </button>

                {showPicker && (
                  <div className="absolute z-50 top-full right-0 mt-2 bg-white rounded-2xl border border-pink-100 shadow-xl p-3 w-64">
                    {/* هدر: سال و ماه */}
                    <div className="flex items-center justify-between mb-3 bg-gradient-to-l from-pink-500 to-pink-600 rounded-xl p-2">
                      <button type="button" onClick={() => { if (pickerMonth === 1) { setPickerMonth(12); setPickerYear(pickerYear - 1); } else setPickerMonth(pickerMonth - 1); }}
                        className="w-7 h-7 text-white hover:bg-white/20 rounded-lg flex items-center justify-center text-lg">‹</button>
                      <div className="flex gap-1">
                        <select value={pickerMonth} onChange={e => setPickerMonth(Number(e.target.value))}
                          className="px-1.5 py-0.5 rounded-lg text-xs bg-white/90 font-bold text-pink-700 cursor-pointer">
                          {persianMonths.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                        </select>
                        <select value={pickerYear} onChange={e => setPickerYear(Number(e.target.value))}
                          className="px-1.5 py-0.5 rounded-lg text-xs bg-white/90 font-bold text-pink-700 cursor-pointer">
                          {[...Array(20)].map((_, i) => <option key={i} value={1400 + i}>{1400 + i}</option>)}
                        </select>
                      </div>
                      <button type="button" onClick={() => { if (pickerMonth === 12) { setPickerMonth(1); setPickerYear(pickerYear + 1); } else setPickerMonth(pickerMonth + 1); }}
                        className="w-7 h-7 text-white hover:bg-white/20 rounded-lg flex items-center justify-center text-lg">›</button>
                    </div>

                    {/* روزهای هفته */}
                    <div className="grid grid-cols-7 gap-0.5 mb-1 text-center text-[10px] text-pink-600 font-bold">
                      <div>ش</div><div>ی</div><div>د</div><div>س</div><div>چ</div><div>پ</div><div>ج</div>
                    </div>

                    {/* روزها */}
                    <div className="grid grid-cols-7 gap-0.5">
                      {[...Array(daysInMonth)].map((_, i) => {
                        const day = i + 1;
                        const isSelected = persianDate === `${pickerYear}/${String(pickerMonth).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
                        const isToday = (() => {
                          try {
                            const today = new Date();
                            const { jy, jm, jd } = jalaali.toJalaali(today.getFullYear(), today.getMonth() + 1, today.getDate());
                            return jy === pickerYear && jm === pickerMonth && jd === day;
                          } catch (e) { return false; }
                        })();
                        return (
                          <button key={i} type="button" onClick={() => selectDay(day)}
                            className={`w-7 h-7 rounded-lg text-xs flex items-center justify-center transition-all ${
                              isSelected ? 'bg-pink-600 text-white font-bold' : 
                              isToday ? 'bg-pink-100 text-pink-700 font-bold' : 
                              'hover:bg-pink-50 text-gray-700'
                            }`}>
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <div><label className="text-sm text-gray-600">یادداشت (اختیاری)</label><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full px-4 py-2.5 border rounded-xl text-sm mt-1 resize-none" /></div>
            </div>

            <div className="flex gap-2 mt-4">
              <button type="submit" className="bg-pink-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold">{editingId ? 'ذخیره' : 'ثبت'}</button>
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); resetForm(); }} className="bg-gray-100 text-gray-600 px-6 py-2.5 rounded-xl text-sm font-bold">انصراف</button>
            </div>
          </form>
        )}

        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          {expenses.length === 0 ? (
            <div className="text-center py-16"><div className="text-5xl mb-3">💸</div><p className="text-gray-500">هنوز هزینه‌ای ثبت نشده</p></div>
          ) : (
            <>
              <div className="divide-y divide-gray-100">
                {expenses.map(e => (
                  <div key={e.id} className="flex items-center gap-3 p-4 hover:bg-gray-50">
                    <div className="w-10 h-10 bg-pink-50 rounded-xl flex items-center justify-center text-xl">{e.icon || '✏️'}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm">{e.title}</p>
                      <p className="text-xs text-gray-400">{toPersian(e.expense_date)}{e.notes ? ` - ${e.notes}` : ''}</p>
                    </div>
                    <span className="font-extrabold text-sm text-red-500 whitespace-nowrap">{Number(e.amount).toLocaleString('fa-IR')} تومان</span>
                    <button onClick={() => handleEdit(e)} className="w-8 h-8 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center"><Edit3 size={14} /></button>
                    <button onClick={() => handleDelete(e.id)} className="w-8 h-8 bg-red-50 text-red-500 rounded-xl flex items-center justify-center"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
              <div className="bg-gray-50 p-4 flex items-center justify-between border-t">
                <span className="font-bold text-gray-700">جمع کل:</span>
                <span className="font-extrabold text-pink-600">{Number(total).toLocaleString('fa-IR')} تومان</span>
              </div>
              <div className="mt-3 text-center">
                <Link 
                  to={`/seller/analytics?shop=${selectedShop}&showExpenses=true`}
                  className="inline-flex items-center gap-1 text-xs text-pink-600 hover:text-pink-700 font-bold"
                >
                  🔙 نمایش هزینه‌ها
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
