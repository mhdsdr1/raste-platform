import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { TrendingUp, ShoppingBag, DollarSign, Percent } from 'lucide-react';
import api from '../../services/api';

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('monthly');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/orders/seller/analytics/?period=${period}`);
      setData(res.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [period]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin" /></div>;

  const hasData = data?.total_orders > 0;

  return (
    <div className="min-h-screen bg-[#fdf2f8]">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-pink-100">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-base font-bold bg-gradient-to-r from-pink-700 to-pink-500 bg-clip-text text-transparent">راسته بازار</Link>
          <Link to="/dashboard" className="text-sm text-gray-500 hover:text-pink-600">← داشبورد</Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-extrabold text-gray-800 mb-6">📊 داشبورد فروش</h1>

        {!hasData ? (
          <div className="bg-white rounded-2xl p-12 border shadow-sm text-center">
            <div className="text-6xl mb-4">📊</div>
            <h2 className="text-xl font-bold text-gray-700 mb-2">هنوز فروشی ثبت نشده!</h2>
            <p className="text-gray-500 text-sm">به محض اینکه اولین فروشت انجام بشه، نمودارها اینجا نمایش داده میشن.</p>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-2xl p-4 border shadow-sm">
                <div className="flex items-center gap-2 mb-2"><DollarSign className="text-green-500" size={20} /><span className="text-xs text-gray-500">کل فروش</span></div>
                <div className="text-xl font-extrabold text-gray-900">{Number(data?.total_sales || 0).toLocaleString('fa-IR')}</div>
                <div className="text-xs text-gray-400">تومان</div>
              </div>
              <div className="bg-white rounded-2xl p-4 border shadow-sm">
                <div className="flex items-center gap-2 mb-2"><ShoppingBag className="text-blue-500" size={20} /><span className="text-xs text-gray-500">کل سفارشات</span></div>
                <div className="text-xl font-extrabold text-gray-900">{data?.total_orders || 0}</div>
              </div>
              <div className="bg-white rounded-2xl p-4 border shadow-sm">
                <div className="flex items-center gap-2 mb-2"><TrendingUp className="text-purple-500" size={20} /><span className="text-xs text-gray-500">میانگین سفارش</span></div>
                <div className="text-xl font-extrabold text-gray-900">{Number(data?.avg_order || 0).toLocaleString('fa-IR')}</div>
                <div className="text-xs text-gray-400">تومان</div>
              </div>
              <div className="bg-white rounded-2xl p-4 border shadow-sm">
                <div className="flex items-center gap-2 mb-2"><Percent className="text-orange-500" size={20} /><span className="text-xs text-gray-500">تعداد محصولات</span></div>
                <div className="text-xl font-extrabold text-gray-900">{data?.top_products?.length || 0}</div>
              </div>
            </div>

            {/* Period Filter */}
            <div className="flex gap-2 mb-4">
              {[{value: 'daily', label: 'روزانه'}, {value: 'weekly', label: 'هفتگی'}, {value: 'monthly', label: 'ماهانه'}, {value: 'yearly', label: 'سالانه'}].map(p => (
                <button key={p.value} onClick={() => setPeriod(p.value)}
                  className={`text-xs px-3 py-2 rounded-xl ${period === p.value ? 'bg-pink-600 text-white' : 'bg-white border'}`}>
                  {p.label}
                </button>
              ))}
            </div>

            {/* Chart */}
            <div className="bg-white rounded-2xl p-6 border shadow-sm mb-6 overflow-x-auto">
              <h2 className="font-bold text-gray-800 mb-4">📈 نمودار فروش</h2>
              <LineChart width={800} height={300} data={data?.chart_data || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => Number(value).toLocaleString('fa-IR')} />
                <Line type="monotone" dataKey="amount" stroke="#db2777" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </div>

            {/* Top Products */}
            <div className="bg-white rounded-2xl p-6 border shadow-sm overflow-x-auto">
              <h2 className="font-bold text-gray-800 mb-4">🏆 پرفروش‌ترین محصولات</h2>
              {data?.top_products?.length === 0 ? (
                <p className="text-gray-500 text-center py-10">هنوز فروشی ثبت نشده</p>
              ) : (
                <BarChart width={800} height={250} data={data?.top_products || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="title" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip formatter={(value) => Number(value).toLocaleString('fa-IR')} />
                  <Bar dataKey="amount" fill="#ec4899" radius={[0, 8, 8, 0]} />
                </BarChart>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
