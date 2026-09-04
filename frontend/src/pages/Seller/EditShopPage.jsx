import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Store, Save, Phone, Eye, EyeOff, X, AlertCircle, Plus, Camera } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'sonner';

export default function EditShopPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [shopType, setShopType] = useState('social');
  const [address, setAddress] = useState('');
  const [phones, setPhones] = useState([{ number: '', show: true }]);
  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [banner, setBanner] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);

  const shopTypes = [
    { value: 'social', label: '📱 فروشنده شبکه اجتماعی', desc: 'محصولات رو توی اینستاگرام، تلگرام و ایتا می‌فروشی' },
    { value: 'hybrid', label: '🔄 فروشنده همه‌کاره', desc: 'هم پیج داری، هم سایت فروشگاهی می‌خوای' },
    { value: 'network', label: '📞 فروشنده پیامکی', desc: 'با تماس و پیامک به مشتری‌ها می‌فروشی' },
  ];

  useEffect(() => {
    api.get(`/shops/${id}/`)
      .then(res => {
        const s = res.data;
        setName(s.name || '');
        setDescription(s.description || '');
        setShopType(s.shop_type || 'social');
        setAddress(s.address || '');
        if (s.logo_url) setLogoPreview(s.logo_url);
        if (s.banner_url) setBannerPreview(s.banner_url);
        // phones از API نمیاد، ولی می‌تونیم contact_phone رو بگیریم
        if (s.contact_phone) {
          setPhones([{ number: s.contact_phone, show: true }]);
        }
      })
      .catch(() => toast.error('فروشگاه یافت نشد'))
      .finally(() => setLoading(false));
  }, [id]);

  const validatePhone = (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length === 11 && cleaned.startsWith('09');
  };

  const addPhone = () => {
    if (phones.length >= 3) { toast.error('حداکثر ۳ شماره'); return; }
    setPhones([...phones, { number: '', show: true }]);
  };

  const removePhone = (index) => {
    if (phones.length <= 1) { toast.error('حداقل یک شماره'); return; }
    setPhones(phones.filter((_, i) => i !== index));
  };

  const updatePhone = (index, value) => setPhones(phones.map((p, i) => i === index ? { ...p, number: value } : p));
  const togglePhoneVisibility = (index) => setPhones(phones.map((p, i) => i === index ? { ...p, show: !p.show } : p));

  const handleSave = async () => {
    if (!name.trim()) { toast.error('نام فروشگاه الزامی است'); return; }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('description', description.trim());
      formData.append('shop_type', shopType);
      formData.append('address', address);
      formData.append('contact_phone', phones[0]?.number?.replace(/\D/g, '') || '');
      if (logo) formData.append('logo', logo);
      if (banner) formData.append('banner', banner);

      await api.put(`/shops/${id}/update/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('فروشگاه ویرایش شد');
      navigate(-1);
    } catch (err) {
      toast.error(err.response?.data?.error || 'خطا در ویرایش');
    } finally { setSaving(false); }
  };

  const selectedType = shopTypes.find(t => t.value === shopType);

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
          <h2 className="font-bold text-xl text-gray-800 mb-6 flex items-center gap-2"><Store className="text-pink-600" size={22} /> ویرایش فروشگاه</h2>

          <div className="space-y-5">
            {/* آپلود عکس */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-bold text-gray-700">لوگو فروشگاه</label>
                <div className="mt-2 flex items-center gap-3">
                  <button type="button" onClick={() => document.getElementById('logoInput').click()}
                    className="w-20 h-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center">
                    {logoPreview ? <img src={logoPreview} className="w-full h-full object-cover rounded-2xl" /> : <Camera size={24} className="text-gray-400" />}
                  </button>
                  {logoPreview && <button onClick={() => { setLogo(null); setLogoPreview(null); }} className="text-red-500"><X size={18} /></button>}
                  <input id="logoInput" type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setLogo(f); setLogoPreview(URL.createObjectURL(f)); } }} />
                </div>
              </div>
              <div>
                <label className="text-sm font-bold text-gray-700">بنر فروشگاه</label>
                <div className="mt-2 flex items-center gap-3">
                  <button type="button" onClick={() => document.getElementById('bannerInput').click()}
                    className="w-full h-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center">
                    {bannerPreview ? <img src={bannerPreview} className="w-full h-full object-cover rounded-2xl" /> : <Camera size={24} className="text-gray-400" />}
                  </button>
                  {bannerPreview && <button onClick={() => { setBanner(null); setBannerPreview(null); }} className="text-red-500"><X size={18} /></button>}
                  <input id="bannerInput" type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setBanner(f); setBannerPreview(URL.createObjectURL(f)); } }} />
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-bold text-gray-700">نام فروشگاه <span className="text-red-500">*</span></label>
              <input value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 border rounded-xl text-sm mt-1.5 focus:ring-2 focus:ring-pink-500" />
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">نوع فروشنده</label>
              <select value={shopType} onChange={e => setShopType(e.target.value)} className="w-full px-4 py-3 border rounded-xl text-sm mt-1.5 focus:ring-2 focus:ring-pink-500">
                {shopTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              {selectedType && <p className="text-xs text-pink-600 bg-pink-50 p-2 rounded-lg mt-2">{selectedType.desc}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-gray-700">شماره تلفن <span className="text-red-500">*</span></label>
                <button type="button" onClick={addPhone} disabled={phones.length >= 3}
                  className="text-xs text-pink-600 font-bold disabled:opacity-30 flex items-center gap-1"><Plus size={14} /> افزودن</button>
              </div>
              {phones.map((phone, index) => (
                <div key={index} className="flex items-center gap-2 mb-2">
                  <div className="relative flex-1">
                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input type="tel" value={phone.number} onChange={e => updatePhone(index, e.target.value)}
                      placeholder="۰۹۱۲ ۳۴۵ ۶۷۸۹" className="w-full pr-10 pl-4 py-2.5 border rounded-xl text-sm" dir="ltr" />
                  </div>
                  <button type="button" onClick={() => togglePhoneVisibility(index)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${phone.show ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
                    {phone.show ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  {phones.length > 1 && (
                    <button type="button" onClick={() => removePhone(index)} className="w-9 h-9 bg-red-50 text-red-500 rounded-xl flex items-center justify-center"><X size={16} /></button>
                  )}
                </div>
              ))}
              <p className="text-xs text-gray-400 flex items-center gap-1 mt-1"><AlertCircle size={12} /> حداکثر ۳ شماره - ۱۱ رقمی با ۰۹</p>
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">آدرس</label>
              <input value={address} onChange={e => setAddress(e.target.value)} className="w-full px-4 py-3 border rounded-xl text-sm mt-1.5" />
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">توضیحات</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                className="w-full px-4 py-3 border rounded-xl text-sm mt-1.5 resize-none" />
            </div>
          </div>

          <button onClick={handleSave} disabled={saving}
            className="w-full mt-6 bg-pink-600 hover:bg-pink-700 text-white py-3.5 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all">
            <Save size={20} /> {saving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
          </button>
        </motion.div>
      </main>
    </div>
  );
}
