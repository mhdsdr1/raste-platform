import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, ShoppingBag, DollarSign, Percent, Wallet, X, Calendar, Users } from 'lucide-react';
import * as jalaali from 'jalaali-js';
import api from '../../services/api';

const PERIODS = [
  { value: 'daily', label: 'روزانه' },
  { value: 'weekly', label: 'هفتگی' },
  { value: 'monthly', label: 'ماهانه' },
  { value: 'yearly', label: 'سالانه' },
];

const persianMonths = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

// تبدیل شمسی به میلادی
const persianToGregorian = (persianDate) => {
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

// تبدیل میلادی به شمسی
const toPersianDate = (isoDate) => {
  if (!isoDate) return '';
  try {
    const d = new Date(isoDate);
    const { jy, jm, jd } = jalaali.toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
  } catch (e) { return isoDate; }
};

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('monthly');
  const [searchParams] = useSearchParams();
  const [selectedShop, setSelectedShop] = useState(searchParams.get('shop') || 'all');
  const [showOrders, setShowOrders] = useState(false);
  const [showExpenses, setShowExpenses] = useState(false);
  const [showDebts, setShowDebts] = useState(false);
  const [debtsData, setDebtsData] = useState(null);
  const [showMatrix, setShowMatrix] = useState(false);
  const [matrixData, setMatrixData] = useState(null);
  const [matrixDateFrom, setMatrixDateFrom] = useState('');
  const [matrixDateTo, setMatrixDateTo] = useState('');
  
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerTarget, setPickerTarget] = useState('from');
  const [pickerYear, setPickerYear] = useState(1405);
  const [pickerMonth, setPickerMonth] = useState(1);

  const getDaysInMonth = (jy, jm) => jalaali.jalaaliMonthLength(jy, jm);

  // تبدیل تاریخ شمسی به عدد برای مقایسه
  const persianToNumber = (persianDate) => {
    if (!persianDate) return 0;
    const parts = persianDate.split('/');
    if (parts.length !== 3) return 0;
    return parseInt(parts[0]) * 10000 + parseInt(parts[1]) * 100 + parseInt(parts[2]);
  };

  const selectDay = (day) => {
    const dateStr = `${pickerYear}/${String(pickerMonth).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
    const num = persianToNumber(dateStr);

    if (pickerTarget === 'matrix_from') {
      if (matrixDateTo && persianToNumber(matrixDateTo) < num) {
        setMatrixDateTo('');
      }
      setMatrixDateFrom(dateStr);
    } else if (pickerTarget === 'matrix_to') {
      if (matrixDateFrom && persianToNumber(matrixDateFrom) > num) {
        toast.error('تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد');
        return;
      }
      setMatrixDateTo(dateStr);
    } else if (pickerTarget === 'from') {
      if (dateTo && persianToNumber(dateTo) < num) {
        setDateTo('');
      }
      setDateFrom(dateStr);
    } else {
      if (dateFrom && persianToNumber(dateFrom) > num) {
        toast.error('تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد');
        return;
      }
      setDateTo(dateStr);
    }
    setShowDatePicker(false);
  };

  const openPicker = (target) => {
    setPickerTarget(target);
    setShowDatePicker(true);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period });
      if (selectedShop !== 'all') params.append('shop_id', selectedShop);
      params.append('show_orders', 'true');
      if (dateFrom) params.append('date_from', persianToGregorian(dateFrom));
      if (dateTo) params.append('date_to', persianToGregorian(dateTo));
      const res = await api.get(`/orders/seller/analytics/?${params.toString()}`);
      setData(res.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => {
    api.get('/shops/my/').then(r => setShops(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => { fetchData(); }, [period, selectedShop, dateFrom, dateTo]);
  
  // باز کردن خودکار مودال هزینه‌ها اگه showExpenses=true توی URL بود
  useEffect(() => {
    if (searchParams.get('showExpenses') === 'true') {
      setShowExpenses(true);
    }
    if (searchParams.get('showDebts') === 'true') {
      setShowDebts(true);
      fetchDebts();
    }
  }, [searchParams]);
  useEffect(() => {
    if (showMatrix) fetchMatrix(matrixDateFrom, matrixDateTo);
  }, [matrixDateFrom, matrixDateTo, showMatrix]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin" /></div>;

  const summary = data?.summary || {};

  const periodTotals = {
    daily: summary.total_sales || 0,
    weekly: summary.total_sales || 0,
    monthly: summary.total_sales || 0,
    yearly: summary.total_sales || 0,
  };


  // نام ماه شمسی
  const persianMonthNames = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

  // گرفتن ماه و سال شمسی از آخرین برچسب نمودار
  const getPersianMonthYear = () => {
    try {
      const lastLabel = data?.chart_data?.[data.chart_data.length - 1]?.label;
      if (!lastLabel) return '';
      const parts = String(lastLabel).split('/');
      if (parts.length >= 2) {
        const year = parts[0];
        const month = parseInt(parts[1]);
        return `${persianMonthNames[month - 1]} ${year}`;
      }
      return '';
    } catch (e) { return ''; }
  };

  // گرفتن سال شمسی از آخرین برچسب نمودار
  const getPersianYear = () => {
    try {
      const lastLabel = data?.chart_data?.[data.chart_data.length - 1]?.label;
      if (!lastLabel) return '';
      const parts = String(lastLabel).split('/');
      if (parts.length >= 1) return parts[0];
      return '';
    } catch (e) { return ''; }
  };

  const fetchDebts = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedShop !== 'all') params.append('shop_id', selectedShop);
      const res = await api.get(`/shops/debts/?${params.toString()}`);
      setDebtsData(res.data);
    } catch (e) { console.error(e); }
  };

  const fetchMatrix = async (from, to) => {
    console.log('fetchMatrix called with:', from, to);
    try {
      const params = new URLSearchParams();
      const f = from !== undefined ? from : matrixDateFrom;
      const t = to !== undefined ? to : matrixDateTo;
      if (f) params.append('date_from', f);
      if (t) params.append('date_to', t);
      const res = await api.get(`/shops/expenses/matrix/?${params.toString()}`);
      setMatrixData(res.data);
    } catch (e) { console.error(e); }
  };

  return (
    <div className="min-h-screen bg-[#fdf2f8] pb-8">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-pink-100">
        <div className="max-w-4xl mx-auto px-3 py-3 flex items-center justify-between">
          <Link to="/" className="text-sm font-bold bg-gradient-to-r from-pink-700 to-pink-500 bg-clip-text text-transparent">راسته بازار</Link>
          <Link to="/dashboard" className="text-xs text-gray-500 hover:text-pink-600">← داشبورد</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-3 py-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-extrabold text-gray-800">💰 داشبورد مالی</h1>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowExpenses(true)} className="text-xs bg-pink-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1">
              <Wallet size={12} /> هزینه‌ها
            </button>
            <button onClick={() => { setShowDebts(true); fetchDebts(); }} className="text-xs bg-fuchsia-500 hover:bg-fuchsia-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1">
              <Users size={12} /> بدهکاران/بستانکاران
            </button>
          </div>
        </div>

        {/* انتخاب فروشگاه */}
        <div className="bg-white rounded-xl p-2 border shadow-sm mb-3 overflow-x-auto">
          <div className="flex items-center gap-1.5 min-w-max">
            <button onClick={() => setSelectedShop('all')}
              className={`text-xs px-3 py-1.5 rounded-lg whitespace-nowrap ${selectedShop === 'all' ? 'bg-pink-600 text-white' : 'bg-gray-50 hover:bg-gray-100'}`}>
              📊 همه فروشگاه‌ها
            </button>
            {shops.map(s => (
              <button key={s.id} onClick={() => setSelectedShop(s.id)}
                className={`text-xs px-3 py-1.5 rounded-lg whitespace-nowrap ${selectedShop === s.id ? 'bg-pink-600 text-white' : 'bg-gray-50 hover:bg-gray-100'}`}>
                🏪 {s.name}
              </button>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
          <div className="bg-white rounded-xl p-3 border shadow-sm">
            <div className="flex items-center gap-1 mb-1"><DollarSign className="text-green-500" size={14} /><span className="text-[10px] text-gray-500">فروش</span></div>
            <div className="text-sm font-extrabold text-gray-900">{Number(summary.total_sales || 0).toLocaleString('fa-IR')}</div>
          </div>
          <div className="bg-white rounded-xl p-3 border shadow-sm">
            <div className="flex items-center gap-1 mb-1"><TrendingUp className="text-purple-500" size={14} /><span className="text-[10px] text-gray-500">سود خالص</span></div>
            <div className={`text-sm font-extrabold ${(summary.net_profit || 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>{Number(summary.net_profit || 0).toLocaleString('fa-IR')}</div>
          </div>
          <button onClick={() => setShowOrders(true)} className="bg-white rounded-xl p-3 border shadow-sm text-right hover:border-pink-300 transition-all">
            <div className="flex items-center gap-1 mb-1"><ShoppingBag className="text-blue-500" size={14} /><span className="text-[10px] text-gray-500">سفارش‌ها</span></div>
            <div className="text-sm font-extrabold text-gray-900">{summary.total_orders || 0} <span className="text-[9px] text-pink-600">مشاهده ←</span></div>
          </button>
          <div className="bg-white rounded-xl p-3 border shadow-sm">
            <div className="flex items-center gap-1 mb-1"><Percent className="text-orange-500" size={14} /><span className="text-[10px] text-gray-500">حاشیه</span></div>
            <div className="text-sm font-extrabold text-gray-900">{summary.margin || 0}٪</div>
          </div>
        </div>

        {/* نمودار فروش */}
        <div className="bg-white rounded-xl p-3 border shadow-sm mb-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-xs text-gray-800">
              📈 نمودار فروش
              {period === 'monthly' && !dateFrom && !dateTo && (
                <span className="text-[10px] text-gray-400 mr-2">
                  ({getPersianMonthYear()})
                </span>
              )}
              {period === 'yearly' && !dateFrom && !dateTo && (
                <span className="text-[10px] text-gray-400 mr-2">
                  ({getPersianYear()})
                </span>
              )}
            </h2>
          </div>

          {/* دکمه‌ها + بازه زمانی در یک خط */}
          <div className="flex items-center gap-1.5 mb-3">
            {/* دکمه‌های دوره - سمت چپ */}
            <div className="flex gap-1">
              {PERIODS.map(p => (
                <button key={p.value} onClick={() => { setPeriod(p.value); setDateFrom(''); setDateTo(''); }}
                  className={`text-[10px] px-2 py-1 rounded-md whitespace-nowrap ${period === p.value && !dateFrom && !dateTo ? 'bg-pink-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {p.label}
                </button>
              ))}
            </div>

            {/* بازه زمانی - کنار دکمه‌های دوره */}
            <div className="flex items-center gap-1">
              <button onClick={() => openPicker('from')} className={`text-[10px] px-2 py-1 rounded-md flex items-center gap-1 ${dateFrom ? 'bg-pink-600 text-white border border-pink-600' : 'bg-white border hover:border-pink-300'}`}>
                <Calendar size={11} className={dateFrom ? 'text-white' : 'text-pink-500'} />
                <span>{dateFrom || 'از تاریخ'}</span>
              </button>
              <button onClick={() => openPicker('to')} className={`text-[10px] px-2 py-1 rounded-md flex items-center gap-1 ${dateTo ? 'bg-pink-600 text-white border border-pink-600' : 'bg-white border hover:border-pink-300'}`}>
                <Calendar size={11} className={dateTo ? 'text-white' : 'text-pink-500'} />
                <span>{dateTo || 'تا تاریخ'}</span>
              </button>
              {(dateFrom || dateTo) && (
                <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-[10px] text-red-500 px-1">✕</button>
              )}
            </div>
          </div>

          {/* مبلغ بازه */}
          <div className="text-center mb-2">
            <span className="text-xs text-gray-500">جمع این بازه: </span>
            <span className="text-sm font-extrabold text-pink-600">{Number(periodTotals[period]).toLocaleString('fa-IR')} تومان</span>
          </div>

          {/* نمودار */}
          <div className="w-full" style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.chart_data || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                <XAxis 
                dataKey="label" 
                tick={{ fontSize: 9 }} 
                interval="preserveStartEnd"
                tickFormatter={(value) => {
                  if (!value) return '';
                  const parts = String(value).split('/');
                  if (parts.length >= 3) return `${parts[1]}/${parts[2]}`;
                  return value;
                }}
              />
                <YAxis tick={{ fontSize: 9 }} width={40} />
                <Tooltip formatter={(value) => Number(value).toLocaleString('fa-IR')} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Line type="monotone" dataKey="amount" stroke="#db2777" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* جدول سود و زیان فروشگاه‌ها */}
        {shops.length > 1 && selectedShop === 'all' && data?.shops_breakdown?.length > 0 && (
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden mb-3">
            <div className="p-3 border-b">
              <h2 className="font-bold text-xs text-gray-800">📊 عملکرد فروشگاه‌ها</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-right p-2 font-bold text-gray-600">فروشگاه</th>
                    <th className="text-center p-2 font-bold text-gray-600">فروش</th>
                    <th className="text-center p-2 font-bold text-gray-600">سود ناخالص</th>
                    <th className="text-center p-2 font-bold text-gray-600">سود خالص</th>
                    <th className="text-center p-2 font-bold text-gray-600">حاشیه</th>
                  </tr>
                </thead>
                <tbody>
                  {data.shops_breakdown.map((s) => (
                    <tr key={s.id} className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedShop(s.id)}>
                      <td className="p-2 text-right font-bold text-gray-700">🏪 {s.name}</td>
                      <td className="p-2 text-center text-gray-600">{Number(s.sales).toLocaleString('fa-IR')}</td>
                      <td className={`p-2 text-center font-bold ${s.profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>{Number(s.profit).toLocaleString('fa-IR')}</td>
                      <td className={`p-2 text-center font-bold ${(s.net_profit || 0) >= 0 ? 'text-green-700' : 'text-red-600'}`}>{Number(s.net_profit || 0).toLocaleString('fa-IR')}</td>
                      <td className="p-2 text-center text-gray-500">{s.margin}٪</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* پرفروش‌ترین محصولات */}
        {data?.top_products?.length > 0 && (
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="p-3 border-b">
              <h2 className="font-bold text-xs text-gray-800">🏆 پرفروش‌ترین محصولات</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-center p-2 font-bold text-gray-600 w-8">#</th>
                    <th className="text-right p-2 font-bold text-gray-600">محصول</th>
                    <th className="text-center p-2 font-bold text-gray-600">تعداد</th>
                    <th className="text-center p-2 font-bold text-gray-600">مبلغ کل</th>
                    <th className="text-center p-2 font-bold text-gray-600">سود خالص</th>
                    <th className="text-center p-2 font-bold text-gray-600">حاشیه</th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_products.map((p, i) => (
                    <tr key={p.id || i} className="border-t hover:bg-gray-50">
                      <td className="p-2 text-center text-gray-400 font-bold">{i + 1}</td>
                      <td className="p-2 text-right font-bold text-gray-700">{p.title}</td>
                      <td className="p-2 text-center text-gray-600">{p.quantity}</td>
                      <td className="p-2 text-center font-bold text-gray-700">{Number(p.amount).toLocaleString('fa-IR')}</td>
                      <td className={`p-2 text-center font-bold ${(p.net_profit || 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>{Number(p.net_profit || 0).toLocaleString('fa-IR')}</td>
                      <td className="p-2 text-center text-gray-500">{p.margin || 0}٪</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      

      {/* مودال بدهکاران/بستانکاران */}
      {showDebts && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3" onClick={() => setShowDebts(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            
            {/* هدر */}
            <div className="flex items-center justify-between p-3 border-b bg-gradient-to-l from-blue-500 to-blue-600">
              <h2 className="font-bold text-white text-sm">
                📋 بدهکاران/بستانکاران
                <span className="text-[10px] text-white/80 mr-2">
                  ({selectedShop === 'all' 
                    ? 'همه فروشگاه‌ها' 
                    : shops.find(s => String(s.id) === String(selectedShop))?.name || ''})
                </span>
              </h2>
              <button onClick={() => setShowDebts(false)} className="text-white"><X size={18} /></button>
            </div>

            {/* خلاصه */}
            {debtsData?.summary && (
              <div className="p-3 bg-blue-50 border-b">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[9px] text-gray-500">🔴 بدهکاران</p>
                    <p className="text-xs font-bold text-red-600">{Number(debtsData.summary.debtor_remaining).toLocaleString('fa-IR')}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-500">🔵 بستانکاران</p>
                    <p className="text-xs font-bold text-blue-600">{Number(debtsData.summary.creditor_remaining).toLocaleString('fa-IR')}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-500">📊 تراز</p>
                    <p className={`text-xs font-bold ${debtsData.summary.balance >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                      {Number(Math.abs(debtsData.summary.balance)).toLocaleString('fa-IR')} تومان
                    </p>
                    <p className="text-[8px] text-gray-400">
                      {debtsData.summary.balance >= 0 ? 'بدهکار' : 'بستانکار'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* لیست */}
            <div className="overflow-y-auto max-h-[55vh] p-3">
              {!debtsData || !debtsData.debts?.length ? (
                <div className="text-center py-10 text-gray-400 text-xs">هنوز بدهکاری ثبت نشده</div>
              ) : (
                <div className="space-y-2">
                  {selectedShop === 'all' ? (
                    // حالت همه فروشگاه‌ها: خلاصه هر فروشگاه
                    !debtsData.shop_summary || debtsData.shop_summary.length === 0 ? (
                      <div className="text-center py-10 text-gray-400 text-xs">هنوز بدهکاری ثبت نشده</div>
                    ) : (
                      <div className="space-y-2">
                        {debtsData.shop_summary.map(s => (
                          <button 
                            key={s.shop_id}
                            onClick={() => {
                              setSelectedShop(String(s.shop_id));
                              setShowDebts(false);
                            }}
                            className="w-full border border-gray-100 rounded-xl p-3 hover:border-fuchsia-300 hover:bg-fuchsia-50/30 transition-all text-right"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-gray-700">
                                {s.shop_id ? '🏪 ' + s.shop_name : '📊 ' + s.shop_name}
                              </span>
                              <span className={`text-xs font-extrabold ${s.balance >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                                {Number(Math.abs(s.balance)).toLocaleString('fa-IR')} تومان
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px]">
                              <div className="flex gap-2">
                                <span className="text-red-600">🔴 {Number(s.debtor_remaining).toLocaleString('fa-IR')}</span>
                              </div>
                              <div className="flex gap-2">
                                <span className="text-blue-600">🔵 {Number(s.creditor_remaining).toLocaleString('fa-IR')}</span>
                              </div>
                            </div>
                            <p className="text-[9px] text-gray-400 mt-1 text-center">
                              {s.balance >= 0 ? '🔴 بدهکار' : '🔵 بستانکار'}
                            </p>
                          </button>
                        ))}
                      </div>
                    )
                  ) : (
                    // حالت فروشگاه خاص: لیست تراکنش‌ها
                    debtsData.debts.map(d => (
                      <div key={d.id} className="border border-gray-100 rounded-xl p-2.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-bold ${d.debt_type === 'debtor' ? 'text-red-600' : 'text-blue-600'}`}>
                            {d.debt_type === 'debtor' ? '🔴' : '🔵'} {d.person_name}
                          </span>
                          <span className={`text-xs font-extrabold ${d.debt_type === 'debtor' ? 'text-red-500' : 'text-blue-500'}`}>
                            {Number(d.amount).toLocaleString('fa-IR')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500">
                          <span>{d.person_phone}</span>
                        </div>
                        {d.notes && <p className="text-[10px] text-gray-400 mt-1">{d.notes}</p>}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* دکمه‌ها */}
            <div className="p-3 border-t bg-gray-50 flex gap-2">
              <Link 
                to={`/seller/debts${selectedShop !== 'all' ? `?shop=${selectedShop}` : ''}`}
                className="flex-1 text-center text-xs bg-blue-600 text-white py-2 rounded-lg font-bold"
              >
                ⚙️ مدیریت بدهکاران/بستانکاران
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* مودال هزینه‌ها */}
      {showExpenses && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3" onClick={() => setShowExpenses(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 border-b bg-gradient-to-l from-pink-500 to-pink-600">
              <h2 className="font-bold text-white text-sm">
                💸 {selectedShop === 'all' 
                  ? 'هزینه‌های جانبی' 
                  : `هزینه‌های ${shops.find(s => String(s.id) === String(selectedShop))?.name || ''}`}
              </h2>
              <button onClick={() => setShowExpenses(false)} className="text-white"><X size={18} /></button>
            </div>

            <div className="overflow-y-auto max-h-[70vh] p-3">
              {selectedShop === 'all' ? (
                // حالت همه فروشگاه‌ها
                (!data?.expenses_by_shop || data.expenses_by_shop.length === 0) ? (
                  <div className="text-center py-10 text-gray-400 text-xs">هزینه‌ای ثبت نشده</div>
                ) : (
                  <div className="space-y-3">
                    {data.expenses_by_shop.map((group, i) => (
                      <div key={i} className="border border-gray-100 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-gray-700">
                            {group.shop_id ? '🏪 ' + group.shop_name : '📊 ' + group.shop_name}
                          </span>
                          <span className="text-xs font-extrabold text-red-500">
                            {Number(group.total).toLocaleString('fa-IR')} تومان
                          </span>
                        </div>
                        <div className="space-y-1 pr-2">
                          {group.expenses.slice(0, 5).map(e => (
                            <div key={e.id} className="flex items-center gap-2 text-[10px] text-gray-500">
                              <span>{e.icon || '✏️'}</span>
                              <span className="flex-1">{e.title}</span>
                              <span className="text-gray-400">{Number(e.amount).toLocaleString('fa-IR')}</span>
                            </div>
                          ))}
                          {group.expenses.length > 5 && (
                            <div className="text-[10px] text-pink-500 mt-1">و {group.expenses.length - 5} مورد دیگر...</div>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="bg-pink-50 rounded-xl p-3 flex items-center justify-between">
                      <span className="font-bold text-xs text-pink-700">💰 جمع کل هزینه‌ها:</span>
                      <span className="font-extrabold text-sm text-pink-700">{Number(summary.total_expenses || 0).toLocaleString('fa-IR')} تومان</span>
                    </div>
                  </div>
                )
              ) : (
                // حالت فروشگاه خاص
                (!data?.expenses_list || data.expenses_list.length === 0) ? (
                  <div className="text-center py-10 text-gray-400 text-xs">هزینه‌ای برای این فروشگاه ثبت نشده</div>
                ) : (
                  <div className="space-y-2">
                    {data.expenses_list.map(e => (
                      <div key={e.id} className="flex items-center gap-2 p-2 border border-gray-100 rounded-xl">
                        <span className="w-9 h-9 bg-pink-50 rounded-lg flex items-center justify-center text-base">{e.icon || '✏️'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-700">{e.title}</p>
                          <p className="text-[10px] text-gray-400">{e.expense_date}</p>
                        </div>
                        <span className="text-xs font-extrabold text-red-500 whitespace-nowrap">{Number(e.amount).toLocaleString('fa-IR')}</span>
                      </div>
                    ))}
                    <div className="bg-pink-50 rounded-xl p-3 flex items-center justify-between mt-2">
                      <span className="font-bold text-xs text-pink-700">💰 جمع کل:</span>
                      <span className="font-extrabold text-sm text-pink-700">{Number(summary.total_expenses || 0).toLocaleString('fa-IR')} تومان</span>
                    </div>
                  </div>
                )
              )}
            </div>

            {/* دکمه‌های عملیات */}
            <div className="p-3 border-t bg-gray-50 flex gap-2">
              {selectedShop === 'all' ? (
                <button onClick={() => { setShowMatrix(true); fetchMatrix(); }} className="flex-1 text-center text-xs bg-pink-600 text-white py-2 rounded-lg font-bold">
                  📊 جدول هزینه‌ها
                </button>
              ) : (
                <Link to={`/seller/expenses?shop=${selectedShop}`} className="flex-1 text-center text-xs bg-pink-600 text-white py-2 rounded-lg font-bold">
                  ⚙️ مدیریت هزینه‌ها
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      
      {/* مودال جدول ماتریسی هزینه‌ها */}
      {showMatrix && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2" onClick={() => setShowMatrix(false)}>
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* هدر */}
            <div className="flex items-center justify-between p-3 border-b bg-gradient-to-l from-pink-500 to-pink-600">
              <h2 className="font-bold text-white text-sm">📊 جدول هزینه‌های همه فروشگاه‌ها</h2>
              <button onClick={() => setShowMatrix(false)} className="text-white"><X size={18} /></button>
            </div>

            {/* بازه زمانی */}
            <div className="flex items-center gap-2 p-3 border-b bg-gray-50 flex-wrap">
              <Calendar size={14} className="text-pink-500" />
              <span className="text-[11px] text-gray-600">بازه زمانی:</span>
              <button onClick={() => openPicker('matrix_from')} className={`text-[10px] px-2 py-1 rounded-md flex items-center gap-1 ${matrixDateFrom ? 'bg-pink-600 text-white' : 'bg-white border'}`}>
                {matrixDateFrom || 'از تاریخ'}
              </button>
              <button onClick={() => openPicker('matrix_to')} className={`text-[10px] px-2 py-1 rounded-md flex items-center gap-1 ${matrixDateTo ? 'bg-pink-600 text-white' : 'bg-white border'}`}>
                {matrixDateTo || 'تا تاریخ'}
              </button>
              {(matrixDateFrom || matrixDateTo) && (
                <button onClick={() => { setMatrixDateFrom(''); setMatrixDateTo(''); }} className="text-[10px] text-red-500">✕ پاک</button>
              )}
            </div>

            {/* جدول */}
            <div className="overflow-auto max-h-[65vh] p-3">
              {!matrixData || !matrixData.shops?.length ? (
                <div className="text-center py-10 text-gray-400 text-xs">داده‌ای برای نمایش نیست</div>
              ) : (
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-pink-50">
                      <th className="border border-pink-200 p-2 text-right font-bold text-pink-700 sticky right-0 bg-pink-50 z-10">
                        فروشگاه
                      </th>
                      {matrixData.expense_types.map(et => (
                        <th key={et} className="border border-pink-200 p-2 text-center font-bold text-pink-700 whitespace-nowrap">
                          {et}
                        </th>
                      ))}
                      <th className="border border-pink-200 p-2 text-center font-bold text-pink-700 bg-pink-100">
                        جمع
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {matrixData.shops.map(shop => (
                      <tr key={shop.id} className="hover:bg-pink-50/50">
                        <td className="border border-pink-200 p-2 text-right font-bold text-gray-700 sticky right-0 bg-white z-10 whitespace-nowrap">
                          🏪 {shop.name}
                        </td>
                        {matrixData.expense_types.map(et => {
                          const val = matrixData.matrix?.[shop.id]?.[et] || 0;
                          return (
                            <td key={et} className="border border-pink-200 p-2 text-center text-gray-700">
                              {val > 0 ? Number(val).toLocaleString('fa-IR') : <span className="text-gray-300">—</span>}
                            </td>
                          );
                        })}
                        <td className="border border-pink-200 p-2 text-center font-bold text-pink-600 bg-pink-50">
                          {Number(matrixData.row_totals?.[shop.id] || 0).toLocaleString('fa-IR')}
                        </td>
                      </tr>
                    ))}
                    {/* ردیف جمع ستون‌ها */}
                    <tr className="bg-pink-100 font-bold">
                      <td className="border border-pink-200 p-2 text-right text-pink-700 sticky right-0 bg-pink-100 z-10">
                        جمع کل
                      </td>
                      {matrixData.expense_types.map(et => (
                        <td key={et} className="border border-pink-200 p-2 text-center text-pink-700">
                          {Number(matrixData.col_totals?.[et] || 0).toLocaleString('fa-IR')}
                        </td>
                      ))}
                      <td className="border border-pink-200 p-2 text-center text-pink-800 bg-pink-200">
                        {Number(matrixData.grand_total || 0).toLocaleString('fa-IR')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>

            {/* جمع کل پایین */}
            <div className="p-3 border-t bg-gradient-to-l from-pink-50 to-pink-100 flex items-center justify-between">
              <span className="font-bold text-xs text-pink-700">💰 جمع کل هزینه‌ها:</span>
              <span className="font-extrabold text-sm text-pink-700">
                {Number(matrixData?.grand_total || 0).toLocaleString('fa-IR')} تومان
              </span>
            </div>
          </div>
        </div>
      )}

      {/* مودال تقویم شمسی */}
      {showDatePicker && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-3" onClick={() => setShowDatePicker(false)}>
          <div className="bg-white rounded-2xl w-72 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between bg-gradient-to-l from-pink-500 to-pink-600 rounded-t-2xl p-3">
              <button onClick={() => { if (pickerMonth === 1) { setPickerMonth(12); setPickerYear(pickerYear - 1); } else setPickerMonth(pickerMonth - 1); }}
                className="w-7 h-7 text-white hover:bg-white/20 rounded-lg flex items-center justify-center text-lg">‹</button>
              <div className="flex gap-1">
                <select value={pickerMonth} onChange={e => setPickerMonth(Number(e.target.value))}
                  className="px-1.5 py-0.5 rounded-lg text-xs bg-white/90 font-bold text-pink-700">
                  {persianMonths.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
                <select value={pickerYear} onChange={e => setPickerYear(Number(e.target.value))}
                  className="px-1.5 py-0.5 rounded-lg text-xs bg-white/90 font-bold text-pink-700">
                  {[...Array(20)].map((_, i) => <option key={i} value={1400 + i}>{1400 + i}</option>)}
                </select>
              </div>
              <button onClick={() => { if (pickerMonth === 12) { setPickerMonth(1); setPickerYear(pickerYear + 1); } else setPickerMonth(pickerMonth + 1); }}
                className="w-7 h-7 text-white hover:bg-white/20 rounded-lg flex items-center justify-center text-lg">›</button>
            </div>
            <div className="p-3">
              <div className="grid grid-cols-7 gap-0.5 mb-1 text-center text-[10px] text-pink-600 font-bold">
                <div>ش</div><div>ی</div><div>د</div><div>س</div><div>چ</div><div>پ</div><div>ج</div>
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {[...Array(getDaysInMonth(pickerYear, pickerMonth))].map((_, i) => {
                  const day = i + 1;
                  const currentDate = pickerTarget === 'from' ? dateFrom :
                                      pickerTarget === 'to' ? dateTo :
                                      pickerTarget === 'matrix_from' ? matrixDateFrom :
                                      pickerTarget === 'matrix_to' ? matrixDateTo : '';
                  const isSelected = currentDate === `${pickerYear}/${String(pickerMonth).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
                  return (
                    <button key={i} onClick={() => selectDay(day)}
                      className={`w-7 h-7 rounded-lg text-xs flex items-center justify-center ${isSelected ? 'bg-pink-600 text-white font-bold' : 'hover:bg-pink-50 text-gray-700'}`}>
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* مودال لیست سفارشات */}
      {showOrders && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3" onClick={() => setShowOrders(false)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 border-b bg-gradient-to-l from-pink-500 to-pink-600">
              <h2 className="font-bold text-white text-sm">📦 لیست سفارشات</h2>
              <button onClick={() => setShowOrders(false)} className="text-white"><X size={18} /></button>
            </div>
            <div className="overflow-y-auto max-h-[70vh]">
              <table className="w-full text-[11px]">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-right p-2 font-bold text-gray-600">کد رهگیری</th>
                    <th className="text-right p-2 font-bold text-gray-600">محصول</th>
                    <th className="text-center p-2 font-bold text-gray-600">تعداد</th>
                    <th className="text-center p-2 font-bold text-gray-600">مبلغ</th>
                    <th className="text-center p-2 font-bold text-gray-600">تاریخ</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.orders_list || []).map(o => (
                    <tr key={o.id} className="border-t hover:bg-gray-50">
                      <td className="p-2 text-right text-[10px] text-gray-500 font-mono">{o.tracking_code}</td>
                      <td className="p-2 text-right font-bold text-gray-700">{o.product_title}</td>
                      <td className="p-2 text-center text-gray-600">{o.quantity}</td>
                      <td className="p-2 text-center font-bold text-pink-600">{Number(o.total_price).toLocaleString('fa-IR')}</td>
                      <td className="p-2 text-center text-[10px] text-gray-400">{toPersianDate(o.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(data?.orders_list || []).length === 0 && (
                <div className="text-center py-8 text-gray-400 text-xs">سفارشی در این بازه نیست</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
