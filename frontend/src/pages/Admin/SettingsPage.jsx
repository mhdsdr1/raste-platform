import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../../services/api';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [appealMax, setAppealMax] = useState(1);
  const [adminMax, setAdminMax] = useState(1);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/shops/settings/');
      setAppealMax(res.data.appeal_max_file_size_mb || 1);
      setAdminMax(res.data.admin_attachment_max_size_mb || 1);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchSettings(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch('/shops/settings/', {
        appeal_max_file_size_mb: appealMax,
        admin_attachment_max_size_mb: adminMax,
      });
      toast.success('تنظیمات ذخیره شد');
    } catch (e) {
      toast.error(e?.response?.data?.error || 'خطا');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdf2f8] pb-8">
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-3 py-3 flex items-center gap-2">
          <Link to="/dashboard" className="text-xs text-gray-500 hover:text-pink-600">← داشبورد</Link>
          <h1 className="text-lg font-extrabold text-gray-800 flex-1">⚙️ تنظیمات سیستم</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-3 py-4">
        {loading ? (
          <div className="text-center py-8 text-gray-400 text-xs">در حال بارگذاری...</div>
        ) : (
          <div className="bg-white rounded-2xl border shadow-sm p-4 space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-700 mb-1 block">
                📎 حداکثر حجم فایل پیوست اعتراض (مگابایت)
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={appealMax}
                onChange={e => setAppealMax(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
              <p className="text-[10px] text-gray-400 mt-1">فروشنده برای پیوست پروانه کسب و ... از این حجم استفاده می‌کند</p>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 mb-1 block">
                📎 حداکثر حجم فایل پاسخ ادمین (مگابایت)
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={adminMax}
                onChange={e => setAdminMax(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
              <p className="text-[10px] text-gray-400 mt-1">ادمین برای ارسال مدارک به فروشنده از این حجم استفاده می‌کند</p>
            </div>

            <button
              onClick={save}
              disabled={saving}
              className="w-full bg-pink-500 text-white py-2.5 rounded-lg text-sm font-bold disabled:opacity-50"
            >
              {saving ? 'در حال ذخیره...' : '✓ ذخیره تنظیمات'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
