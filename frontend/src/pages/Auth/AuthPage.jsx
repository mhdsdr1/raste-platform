import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Phone, KeyRound, ArrowLeft } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { authService } from '../../services/authService';
import { fadeIn, scaleIn } from '../../utils/animations';

export default function AuthPage() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('phone');
  const [userType, setUserType] = useState('buyer');
  const [purpose, setPurpose] = useState('register');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login, register } = useAuthStore();

  const handleSendOTP = async () => {
    if (phone.length !== 11 || !phone.startsWith('09')) {
      toast.error('شماره تلفن نامعتبر است');
      return;
    }
    setLoading(true);
    try {
      await authService.requestOTP(phone, purpose);
      setStep('code');
      toast.success('کد تأیید ارسال شد 📩');
    } catch (error) {
      toast.error(error.response?.data?.error || 'خطا در ارسال کد');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (code.length !== 4) {
      toast.error('کد باید ۴ رقم باشد');
      return;
    }
    setLoading(true);
    try {
      if (purpose === 'register') {
        await register(phone, code, userType);
        toast.success('ثبت‌نام با موفقیت انجام شد! 🎉');
      } else {
        await login(phone, code);
        toast.success('خوش آمدید! 👋');
      }
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.error || 'کد اشتباه است');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 p-4">
      <motion.div 
        {...scaleIn}
        className="w-full max-w-md"
      >
        <div className="card">
          {/* Logo */}
          <div className="text-center mb-8">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-5xl mb-4"
            >
              🚀
            </motion.div>
            <h1 className="text-3xl font-bold gradient-text">راسته</h1>
            <p className="text-gray-500 mt-2">پلتفرم خرید و فروش محلی</p>
          </div>

          {step === 'phone' ? (
            <motion.div {...fadeIn}>
              {/* Toggle Register/Login */}
              <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-xl">
                {[
                  { value: 'register', label: '📝 ثبت‌نام' },
                  { value: 'login', label: '🔑 ورود' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setPurpose(value)}
                    className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                      purpose === value
                        ? 'bg-white shadow text-primary-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* User Type (only for register) */}
              {purpose === 'register' && (
                <motion.div {...fadeIn} className="mb-4">
                  <label className="block text-sm text-gray-600 mb-2 font-medium">نوع کاربر</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'buyer', label: '🛍️ خریدار' },
                      { value: 'seller', label: '🏪 فروشنده' },
                      { value: 'courier', label: '🛵 پیک' },
                      { value: 'service_provider', label: '🔧 سرویس‌دهنده' },
                    ].map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => setUserType(value)}
                        className={`p-3 rounded-xl text-sm font-medium transition-all ${
                          userType === value
                            ? 'bg-primary-100 text-primary-700 border-2 border-primary-500'
                            : 'bg-gray-50 text-gray-600 border-2 border-transparent hover:bg-gray-100'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Phone Input */}
              <div className="mb-6">
                <label className="block text-sm text-gray-600 mb-2 font-medium">شماره تلفن</label>
                <div className="relative">
                  <Phone className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                    className="input-field pr-12 text-center text-lg tracking-widest font-mono"
                    dir="ltr"
                  />
                </div>
              </div>

              <button
                onClick={handleSendOTP}
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  '📩 دریافت کد تأیید'
                )}
              </button>
            </motion.div>
          ) : (
            <motion.div {...fadeIn}>
              {/* Phone Display */}
              <div className="text-center mb-6 p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500 mb-1">کد به این شماره ارسال شد</p>
                <p className="text-lg font-bold text-gray-700" dir="ltr">{phone}</p>
              </div>

              {/* Code Input */}
              <div className="mb-6">
                <label className="block text-sm text-gray-600 mb-2 font-medium">کد تأیید ۴ رقمی</label>
                <div className="relative">
                  <KeyRound className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="----"
                    className="input-field pr-12 text-center text-2xl tracking-[0.5em] font-mono"
                    dir="ltr"
                    autoFocus
                  />
                </div>
              </div>

              <button
                onClick={handleVerify}
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 mb-4"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  '✅ تأیید و ادامه'
                )}
              </button>

              <button
                onClick={() => setStep('phone')}
                className="btn-secondary w-full flex items-center justify-center gap-2"
              >
                <ArrowLeft size={18} />
                اصلاح شماره
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
