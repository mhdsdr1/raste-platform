import { Link } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

export default function ControlCenterPage() {
  const { user } = useAuthStore();

  if (!user?.can_access_control) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdf2f8]">
        <div className="text-center">
          <p className="text-red-500 font-bold">دسترسی ندارید</p>
          <Link to="/dashboard" className="text-sm text-pink-600 mt-2 block">← بازگشت</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdf2f8] pb-8">
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-3 py-3 flex items-center gap-2">
          <Link to="/dashboard" className="text-xs text-gray-500 hover:text-pink-600">← داشبورد</Link>
          <h1 className="text-lg font-extrabold text-gray-800 flex-1">🛡️ مرکز کنترل</h1>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-3 py-4">
        <div className="text-center py-20 text-gray-400 text-sm">
          درخت کاربران و فروشگاه‌ها — به‌زودی
        </div>
      </main>
    </div>
  );
}
