import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Store, Package, Truck, Star } from 'lucide-react';
import useAuthStore from '../../store/authStore';

const features = [
  { icon: Store, title: 'فروشگاه شخصی', desc: 'فروشگاه آنلاین خودت رو بساز' },
  { icon: Package, title: 'هم‌خرید', desc: 'خرید گروهی با قیمت عمده' },
  { icon: Truck, title: 'پیک محلی', desc: 'ارسال سریع با پیک' },
  { icon: Star, title: 'باشگاه مشتریان', desc: 'امتیاز بگیر و جایزه ببر' },
];

function HeaderLogo() {
  return (
    <motion.div 
      className="flex items-center gap-1.5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.svg 
        viewBox="0 0 40 40" 
        className="w-8 h-8"
        animate={{ rotate: [0, -3, 3, -2, 0] }}
        transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
      >
        {/* ستون فقرات */}
        <motion.g
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          style={{ transformOrigin: '20px 5px' }}
        >
          <rect x="17" y="5" width="6" height="30" rx="3" fill="#db2777" />
          <rect x="15" y="8" width="10" height="4" rx="2" fill="#f472b6" opacity="0.6" />
          <rect x="15" y="15" width="10" height="4" rx="2" fill="#f472b6" opacity="0.6" />
          <rect x="15" y="22" width="10" height="4" rx="2" fill="#f472b6" opacity="0.6" />
        </motion.g>
        
        {/* فقط یه سکه بزرگ کنار ستون */}
        <motion.g
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: [0, 1, 1], y: [0, -4, 0] }}
          transition={{ duration: 1.5, delay: 0.8, y: { duration: 2, repeat: Infinity } }}
        >
          <circle cx="8" cy="28" r="7" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1.2" />
          <circle cx="8" cy="28" r="3" fill="none" stroke="#f59e0b" strokeWidth="0.5" opacity="0.5" />
        </motion.g>
        
        {/* جرقه */}
        <motion.circle
          cx="32" cy="8" r="2.5"
          fill="#ec4899"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1, delay: 1.2 }}
        />
      </motion.svg>
      
      <motion.span 
        className="text-sm md:text-base font-bold bg-gradient-to-r from-pink-700 to-pink-500 bg-clip-text text-transparent"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        راسته بازار
      </motion.span>
    </motion.div>
  );
}

function GroupBuyIcon() {
  return (
    <motion.svg viewBox="0 0 80 60" className="w-12 h-12 mx-auto">
      <motion.g initial={{ x: -15, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.4, delay: 0.2 }}>
        <circle cx="22" cy="18" r="10" fill="#f472b6" />
        <path d="M12,18 Q12,5 22,5 Q32,5 32,18" fill="#9d174d" />
        <circle cx="19" cy="17" r="1.5" fill="white" />
        <circle cx="19" cy="17" r="0.8" fill="#1a1a1a" />
        <path d="M17,22 Q19,25 22,22" fill="none" stroke="#831843" strokeWidth="1" />
        <line x1="22" y1="28" x2="22" y2="48" stroke="#db2777" strokeWidth="5" strokeLinecap="round" />
        <line x1="22" y1="35" x2="35" y2="32" stroke="#db2777" strokeWidth="3" strokeLinecap="round" />
        <line x1="22" y1="48" x2="15" y2="58" stroke="#9d174d" strokeWidth="4" strokeLinecap="round" />
        <line x1="22" y1="48" x2="29" y2="58" stroke="#9d174d" strokeWidth="4" strokeLinecap="round" />
      </motion.g>
      <motion.g initial={{ x: 15, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.4, delay: 0.4 }}>
        <circle cx="58" cy="18" r="10" fill="#fbcfe8" />
        <path d="M48,18 Q48,5 58,5 Q68,5 68,18" fill="#831843" />
        <circle cx="55" cy="17" r="1.5" fill="white" />
        <circle cx="55" cy="17" r="0.8" fill="#1a1a1a" />
        <path d="M53,22 Q56,25 59,22" fill="none" stroke="#831843" strokeWidth="1" />
        <line x1="58" y1="28" x2="58" y2="48" stroke="#ec4899" strokeWidth="5" strokeLinecap="round" />
        <line x1="58" y1="35" x2="45" y2="32" stroke="#ec4899" strokeWidth="3" strokeLinecap="round" />
        <line x1="58" y1="48" x2="51" y2="58" stroke="#be185d" strokeWidth="4" strokeLinecap="round" />
        <line x1="58" y1="48" x2="65" y2="58" stroke="#be185d" strokeWidth="4" strokeLinecap="round" />
      </motion.g>
      <motion.g initial={{ scale: 0 }} animate={{ scale: 1, y: [0, -3, 0] }} transition={{ duration: 0.5, delay: 0.7, y: { duration: 2, repeat: Infinity } }}>
        <circle cx="40" cy="30" r="9" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1.5" />
      </motion.g>
    </motion.svg>
  );
}

function MarketplaceArt() {
  return (
    <motion.div className="relative w-full max-w-xs md:max-w-md mx-auto aspect-[4/3]">
      <motion.svg viewBox="0 0 400 300" className="w-full h-full">
        <motion.circle cx="200" cy="150" r="140" fill="#fce7f3" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.6, type: "spring", stiffness: 120 }} />
        <motion.circle cx="200" cy="150" r="130" fill="none" stroke="#fbcfe8" strokeWidth="2" strokeDasharray="8,8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.5 }} />
        
        <motion.g initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, delay: 0.6 }}>
          <rect x="120" y="120" width="160" height="110" rx="10" fill="white" stroke="#ec4899" strokeWidth="2" />
          <polygon points="110,120 200,70 290,120" fill="#f472b6" />
          <polygon points="110,120 200,75 290,120" fill="#ec4899" opacity="0.5" />
          <rect x="170" y="170" width="60" height="60" rx="8" fill="#fdf2f8" stroke="#f472b6" strokeWidth="1.5" />
          <circle cx="222" cy="200" r="3" fill="#db2777" />
          <rect x="135" y="140" width="30" height="25" rx="4" fill="#fce7f3" stroke="#f9a8d4" strokeWidth="1" />
          <rect x="235" y="140" width="30" height="25" rx="4" fill="#fce7f3" stroke="#f9a8d4" strokeWidth="1" />
          <rect x="150" y="105" width="100" height="20" rx="6" fill="#db2777" />
          <text x="200" y="119" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">راسته بازار</text>
        </motion.g>
        
        {/* سبد خرید ۱ - چپ (مربعی با دسته) */}
        <motion.g initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.5, delay: 1.2 }}>
          <rect x="45" y="170" width="35" height="30" rx="6" fill="white" stroke="#f472b6" strokeWidth="1.5" />
          <path d="M50,170 Q62,155 75,170" fill="none" stroke="#f472b6" strokeWidth="2" />
          <circle cx="57" cy="190" r="4" fill="#fbcfe8" />
          <circle cx="70" cy="192" r="3" fill="#f9a8d4" />
        </motion.g>
        
        {/* سبد خرید ۲ - راست (مربعی با دسته) */}
        <motion.g initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.5, delay: 1.4 }}>
          <rect x="315" y="175" width="30" height="25" rx="5" fill="white" stroke="#ec4899" strokeWidth="1.5" />
          <path d="M320,175 Q330,162 340,175" fill="none" stroke="#ec4899" strokeWidth="2" />
          <rect x="322" y="180" width="8" height="8" rx="2" fill="#fce7f3" />
          <rect x="333" y="182" width="7" height="6" rx="2" fill="#fdf2f8" />
        </motion.g>
        
        {/* گوشی */}
        <motion.g initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, delay: 1.6 }}>
          <rect x="40" y="90" width="28" height="45" rx="5" fill="#1f2937" />
          <rect x="43" y="95" width="22" height="30" rx="2" fill="#fdf2f8" />
          <rect x="48" y="100" width="12" height="8" rx="2" fill="#ec4899" />
          <circle cx="54" cy="115" r="4" fill="#fbbf24" />
        </motion.g>
        
        {/* ماهی */}
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} transition={{ duration: 0.5, delay: 2.4 }}>
          <ellipse cx="340" cy="100" rx="12" ry="6" fill="#ec4899" />
          <polygon points="352,100 360,93 360,107" fill="#db2777" opacity="0.8" />
          <circle cx="332" cy="98" r="1.5" fill="white" />
          <motion.ellipse cx="340" cy="105" rx="3" ry="2" fill="#fbcfe8" opacity="0.5"
            animate={{ rotate: [0, 20, 0] }} transition={{ duration: 1.5, repeat: Infinity }}
            style={{ transformOrigin: '340px 105px' }} />
        </motion.g>
      </motion.svg>
    </motion.div>
  );
}

export default function HomePage() {
  const { isAuthenticated, logout } = useAuthStore();

  return (
    <div className="h-dvh flex flex-col bg-[#fdf2f8] overflow-hidden">
      
      <header className="shrink-0 bg-white/80 backdrop-blur-lg border-b border-pink-100 px-4 py-2.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/">
            <HeaderLogo />
          </Link>
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" className="text-xs md:text-sm text-gray-600 hover:text-pink-600">پنل من</Link>
                <button onClick={logout} className="text-xs md:text-sm text-gray-400 hover:text-red-500">خروج</button>
              </>
            ) : (
              <Link to="/auth" className="text-xs md:text-sm bg-pink-600 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg hover:bg-pink-700 transition-all">ورود</Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto flex items-center justify-center px-4 py-4">
        <div className="w-full max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-4 md:gap-8">
          
          {/* CENTER */}
          <div className="flex-1 text-center max-w-md mx-auto">
            <MarketplaceArt />
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 2.5 }}
              className="text-xl md:text-3xl font-black mb-1 mt-2">
              <span className="bg-gradient-to-r from-pink-700 to-pink-500 bg-clip-text text-transparent">راسته بازار</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 2.7 }}
              className="text-sm md:text-base text-pink-600/70 mb-3 font-medium">
              آفلاین و آنلاین، بخر و بفروش
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 2.9 }}
              className="flex gap-2 md:gap-3 justify-center">
              <Link to="/auth" className="bg-pink-600 hover:bg-pink-700 text-white px-5 md:px-6 py-2 md:py-2.5 rounded-xl font-bold transition-all hover:shadow-xl hover:shadow-pink-200 active:scale-95 text-xs md:text-sm">شروع</Link>
              <Link to="/marketplace" className="bg-white hover:bg-pink-50 text-pink-600 border-2 border-pink-300 px-5 md:px-6 py-2 md:py-2.5 rounded-xl font-bold transition-all active:scale-95 text-xs md:text-sm">بازارچه</Link>
            </motion.div>
          </div>

          {/* RIGHT - Feature Cards - آیکون بزرگ، متن یک خط */}
          <div className="hidden md:grid grid-cols-2 gap-3 w-60 flex-shrink-0">
            {features.map((feature, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 3 + i * 0.15 }}
                whileHover={{ y: -3, scale: 1.02 }}
                className="bg-white/85 backdrop-blur-sm rounded-2xl p-3 border-2 border-pink-100 shadow-sm hover:shadow-md hover:border-pink-200 transition-all cursor-pointer flex flex-col items-center justify-center h-[100px]">
                {feature.title === 'هم‌خرید' ? (
                  <GroupBuyIcon />
                ) : (
                  <feature.icon className="w-8 h-8 text-pink-600 mb-1" />
                )}
                <h3 className="text-xs font-bold text-gray-800 mb-0.5 text-center whitespace-nowrap">{feature.title}</h3>
                <p className="text-[10px] text-gray-500 text-center">{feature.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden grid grid-cols-2 gap-2 w-full">
            {features.map((feature, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 3 + i * 0.1 }}
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-2.5 text-center border border-pink-100 shadow-sm">
                {feature.title === 'هم‌خرید' ? <GroupBuyIcon /> : <feature.icon className="w-6 h-6 text-pink-600 mx-auto mb-1" />}
                <h3 className="text-xs font-bold text-gray-800">{feature.title}</h3>
              </motion.div>
            ))}
          </div>
        </div>
      </main>

      <footer className="shrink-0 text-center py-1.5 text-xs text-pink-400/70 border-t border-pink-100 bg-white/50">
        © ۱۴۰۵ - راسته | آفلاین و آنلاین، بخر و بفروش
      </footer>
    </div>
  );
}
