import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, X, Search, Trash2, Edit2, Check } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../services/api';
import * as jalaali from 'jalaali-js';
import JalaliCalendar, { todayShamsi } from '../../components/JalaliCalendar';

export default function InstallmentsPage() {
  const [searchParams] = useSearchParams();
  const [selectedShop, setSelectedShop] = useState(searchParams.get('shop') || 'all');
  const [shops, setShops] = useState([]);
  const [plans, setPlans] = useState([]);
  const [shopSummary, setShopSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // مودال افزودن
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState('regular'); // regular | custom
  
  // مودال نمایش اقساط
  const [showPlan, setShowPlan] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [showEditAmounts, setShowEditAmounts] = useState(false);
  const [editingAmounts, setEditingAmounts] = useState([]);
  const [showEditPerson, setShowEditPerson] = useState(false);
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [editDateIndex, setEditDateIndex] = useState(null);
  const [editPersonName, setEditPersonName] = useState('');
  const [editPersonPhone, setEditPersonPhone] = useState('');
  const [editPersonNid, setEditPersonNid] = useState('');
  const [editPersonPc, setEditPersonPc] = useState('');
  const [editPersonAddr, setEditPersonAddr] = useState('');
  const [editPersonErrors, setEditPersonErrors] = useState({});
  const [currentPlan, setCurrentPlan] = useState(null);
  
  // فرم
  const [personName, setPersonName] = useState('');
  const [personPhone, setPersonPhone] = useState('');
  const [personNationalId, setPersonNationalId] = useState('');
  const [personPostalCode, setPersonPostalCode] = useState('');
  const [personAddress, setPersonAddress] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [totalAmountDisplay, setTotalAmountDisplay] = useState('');
  const [installmentCount, setInstallmentCount] = useState('');
  const [paymentDay, setPaymentDay] = useState('last');
  const [paymentMethod, setPaymentMethod] = useState('check');
  const [guarantee, setGuarantee] = useState('check');
  
  // اقساط دلخواه
  const [customInstallments, setCustomInstallments] = useState([
    { amount: '', amountDisplay: '', due_date_shamsi: '' }
  ]);
  
  // پیش‌نمایش
  const [previewInstallments, setPreviewInstallments] = useState([]);
  
  // تقویم
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerTarget, setPickerTarget] = useState(null);
  const [errors, setErrors] = useState({ name: '', phone: '', nid: '', pc: '' });
  const [checkSerial, setCheckSerial] = useState('');
  const [checkNotes, setCheckNotes] = useState('');
  const [guaranteeSerial, setGuaranteeSerial] = useState('');
  const [guaranteeNotes, setGuaranteeNotes] = useState(''); // 'custom_0' یا ...
  
  // ═══ فچ ═══
  const fetchPlans = async () => {
    setLoading(true);
    try {
      if (selectedShop === 'all') {
        const res = await api.get('/shops/installments/shop-summary/');
        setShopSummary(res.data.shops || []);
        setPlans([]);
      } else {
        const params = new URLSearchParams();
        params.append('shop_id', selectedShop);
        if (search) params.append('search', search);
        const res = await api.get(`/shops/installments/?${params.toString()}`);
        setPlans(res.data.plans || []);
        setShopSummary([]);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };
  
  useEffect(() => {
    api.get('/shops/my/').then(r => setShops(r.data || [])).catch(() => {});
  }, []);
  
  useEffect(() => { fetchPlans(); }, [selectedShop, search]);
  
  // ═══ محاسبه اقساط منظم ═══
  const calculateRegular = async () => {
    if (!totalAmount || !installmentCount) {
      setPreviewInstallments([]);
      return;
    }
    if (Number(installmentCount) > 12) {
      toast.error('حداکثر ۱۲ قسط');
      return;
    }
    try {
      const res = await api.post('/shops/installments/calculate/', {
        total_amount: Number(totalAmount),
        installment_count: Number(installmentCount),
      });
      setPreviewInstallments(res.data.installments || []);
    } catch (e) {
      console.error(e);
      setPreviewInstallments([]);
    }
  };
  
  useEffect(() => {
    if (formMode === 'regular') {
      calculateRegular();
    }
  }, [totalAmount, installmentCount, formMode]);
  
  // ═══ ثبت ═══
  const handleSubmit = async (e) => {
    e.preventDefault();
    const nameErr = validateName(personName);
    const phoneErr = validatePhone(personPhone);
    let nidErr = validateNationalId(personNationalId);
    if (!personNationalId) nidErr = 'کد ملی الزامی است';
    const pcErr = validatePostalCode(personPostalCode);
    
    if (nameErr || phoneErr || nidErr || pcErr) {
      toast.error(nameErr || phoneErr || nidErr || pcErr);
      return;
    }
    
    let installmentsData = [];
    let total = 0;
    
    if (formMode === 'regular') {
      if (previewInstallments.length === 0) {
        toast.error('ابتدا مبلغ و تعداد را وارد کنید');
        return;
      }
      installmentsData = previewInstallments;
      total = Number(totalAmount);
    } else {
      const valid = customInstallments.filter(i => Number(i.amount) > 0 && i.due_date_shamsi);
      if (valid.length === 0) {
        toast.error('حداقل یک قسط با مبلغ و تاریخ');
        return;
      }
      installmentsData = valid.map((i, idx) => ({
        number: idx + 1,
        amount: Number(i.amount),
        due_date_shamsi: i.due_date_shamsi,
      }));
      total = valid.reduce((s, i) => s + Number(i.amount), 0);
    }
    
    try {
      const payload = {
        person_name: personName,
        person_phone: personPhone,
        person_national_id: personNationalId,
        person_postal_code: personPostalCode,
        person_address: personAddress,
        plan_type: formMode,
        total_amount: total,
        installment_count: installmentsData.length,
        payment_day: paymentDay,
        payment_method: paymentMethod,
        guarantee,
        check_serial: checkSerial,
        check_notes: checkNotes,
        guarantee_serial: guaranteeSerial,
        guarantee_notes: guaranteeNotes,
        installments: installmentsData,
      };
      if (selectedShop !== 'all') payload.shop = selectedShop;
      
      await api.post('/shops/installments/create/', payload);
      toast.success('طرح اقساط ثبت شد');
      setShowForm(false);
      resetForm();
      fetchPlans();
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.error || 'خطا در ثبت');
    }
  };
  
  const resetForm = () => {
    setPersonName(''); setPersonPhone(''); setPersonNationalId('');
    setPersonPostalCode(''); setPersonAddress('');
    setTotalAmount(''); setTotalAmountDisplay('');
    setInstallmentCount(''); setPaymentDay('last');
    setPaymentMethod('check'); setGuarantee('check');
    setCustomInstallments([{ amount: '', amountDisplay: '', due_date_shamsi: '' }]);
    setPreviewInstallments([]);
    setCheckSerial(''); setCheckNotes('');
    setGuaranteeSerial(''); setGuaranteeNotes('');
  };
  
  // ═══ نمایش اقساط ═══
  const openPlan = (plan) => {
    setCurrentPlan(plan);
    setShowPlan(true);
  };
  
  const togglePaid = async (installmentId) => {
    try {
      const res = await api.patch(`/shops/installments/${installmentId}/toggle/`);
      
      // آپدیت currentPlan
      if (currentPlan) {
        const updated = currentPlan.installments.map(i => 
          i.id === installmentId ? res.data : i
        );
        // محاسبه مجدد paid_count و total_paid
        const newPaidCount = updated.filter(i => i.is_paid).length;
        const newTotalPaid = updated.filter(i => i.is_paid).reduce((s, i) => s + Number(i.amount), 0);
        setCurrentPlan({ 
          ...currentPlan, 
          installments: updated,
          paid_count: newPaidCount,
          total_paid: newTotalPaid,
        });
      }
      
      // ═══ آپدیت لیست اصلی (بدون رفرش) ═══
      await fetchPlans();
    } catch (e) {
      console.error(e);
      toast.error('خطا');
    }
  };
  
  const editPlan = (plan) => {
    setEditingPlan(plan);
    setPersonName(plan.person_name || '');
    setPersonPhone(plan.person_phone || '');
    setPersonNationalId(plan.person_national_id || '');
    setPersonPostalCode(plan.person_postal_code || '');
    setPersonAddress(plan.person_address || '');
    setTotalAmount(String(plan.total_amount || ''));
    setTotalAmountDisplay(plan.total_amount ? Number(plan.total_amount).toLocaleString('fa-IR') : '');
    setInstallmentCount(String(plan.total_installments || ''));
    setPaymentMethod(plan.payment_method || 'check');
    setGuarantee(plan.guarantee || 'check');
    setFormMode(plan.plan_type || 'regular');
    setShowForm(true);
  };
  
  const deletePlan = async (planId) => {
    if (!confirm('این طرح اقساطی حذف شود؟')) return;
    try {
      await api.delete(`/shops/installments/${planId}/delete/`);
      toast.success('حذف شد');
      fetchPlans();
    } catch (e) { toast.error('خطا'); }
  };
  
  const handleAmountChange = (e, setter, displaySetter) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setter(raw);
    displaySetter(raw ? Number(raw).toLocaleString('fa-IR') : '');
  };
  
  // ═══ اعتبارسنجی ═══
  const validatePhone = (val) => {
    if (!val) return 'موبایل الزامی';
    if (!/^09[0-9]{9}$/.test(val)) return 'موبایل باید با 09 شروع و ۱۱ رقم باشد';
    return '';
  };
  
  const validateNationalId = (val) => {
    if (!val) return '';
    if (!/^[0-9]{10}$/.test(val)) return 'کد ملی باید ۱۰ رقم باشد';
    if (/^(\d)\1{9}$/.test(val)) return 'کد ملی نامعتبر';
    const check = parseInt(val[9]);
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(val[i]) * (10 - i);
    const r = sum % 11;
    const isValid = (r < 2 && check === r) || (r >= 2 && check === 11 - r);
    if (!isValid) return 'کد ملی نامعتبر';
    return '';
  };
  
  const validatePostalCode = (val) => {
    if (!val) return '';
    if (!/^[0-9]{10}$/.test(val)) return 'کد پستی باید ۱۰ رقم باشد';
    return '';
  };
  
  const validateName = (val) => {
    if (!val || val.trim().length < 2) return 'نام باید حداقل ۲ حرف باشد';
    if (/[0-9]/.test(val)) return 'نام نمی‌تواند شامل عدد باشد';
    return '';
  };
  
  const shopName = selectedShop === 'all'  ? 'همه فروشگاه‌ها' : (shops.find(s => String(s.id) === String(selectedShop))?.name || '');
  
  return (
    <div className="min-h-screen bg-[#fdf2f8] pb-8">
      {/* هدر */}
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-3 py-3 flex items-center gap-2">
          <Link to="/seller/analytics" className="text-xs text-gray-500 hover:text-pink-600">← داشبورد</Link>
          <h1 className="text-lg font-extrabold text-gray-800 flex-1">
            💳 خرید اقساطی
            <span className="text-[10px] text-gray-400 mr-2">({shopName})</span>
          </h1>
          {selectedShop !== 'all' && (
            <button onClick={() => { setShowForm(true); resetForm(); }} className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1">
              <Plus size={14} /> افزودن
            </button>
          )}
        </div>
      </header>
      
      <main className="max-w-3xl mx-auto px-3 py-4">
        {/* جستجو */}
        <div className="relative mb-3">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            placeholder="جستجو: نام، موبایل، کد ملی..."
            className="w-full pr-9 pl-3 py-2 border rounded-lg text-xs"
          />
        </div>
        
        {/* لیست */}
        {loading ? (
          <div className="text-center py-8 text-gray-400 text-xs">در حال بارگذاری...</div>
        ) : selectedShop === 'all' ? (
          // ═══ حالت همه فروشگاه‌ها: خلاصه ═══
          shopSummary.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-xs bg-white rounded-2xl border">
              <span className="text-3xl block mb-2">💳</span>
              هنوز طرح اقساطی ثبت نشده
            </div>
          ) : (
            <div className="space-y-2">
              {shopSummary.map((shop, idx) => {
                const isComplete = shop.paid_amount >= shop.total_amount;
                return (
                  <div 
                    key={idx}
                    className="bg-white rounded-xl border border-indigo-100 shadow-sm p-3 hover:border-indigo-300 transition-all cursor-pointer"
                    onClick={() => setSelectedShop(String(shop.shop_id || ''))}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🏪</span>
                        <div>
                          <p className="text-sm font-bold text-gray-700">{shop.shop_name}</p>
                          <p className="text-[10px] text-gray-400">💳 {shop.persons_count} نفر بدهکار</p>
                        </div>
                      </div>
                    </div>
                    <div className="pt-2 border-t space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-gray-600 font-bold">💰 کل اقساط پرداخت نشده:</span>
                        <span className="font-extrabold text-indigo-600">
                          {Number(shop.unpaid_amount || 0).toLocaleString('fa-IR')} تومان
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-gray-500">✅ کل اقساط پرداخت شده:</span>
                        <span className="font-bold text-green-600">
                          {Number(shop.paid_amount).toLocaleString('fa-IR')} تومان
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-gray-500">⏰ کل اقساط سررسید گذشته:</span>
                        <span className="font-bold text-red-600">
                          {Number(shop.overdue_amount || 0).toLocaleString('fa-IR')} تومان
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          // ═══ حالت فروشگاه خاص: لیست اشخاص ═══
          plans.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-xs bg-white rounded-2xl border">
              <span className="text-3xl block mb-2">💳</span>
              هنوز طرح اقساطی ثبت نشده
            </div>
          ) : (
            <div className="space-y-2">
              {plans.map((plan, idx) => {
                const paidCount = plan.paid_count || 0;
                const totalCount = plan.total_installments || 0;
                const isComplete = paidCount === totalCount && totalCount > 0;
                return (
                  <div 
                    key={idx} 
                    className="bg-white rounded-xl border border-indigo-100 shadow-sm p-3 hover:border-indigo-300 transition-all cursor-pointer"
                    onClick={() => openPlan(plan)}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-base mt-0.5">{isComplete ? '✅' : '💳'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-700 truncate">{plan.person_name}</p>
                        <p className="text-[9px] text-gray-400 truncate">📱 {plan.person_phone}</p>
                      </div>
                      <div className="text-left flex-shrink-0">
                        {/* کل */}
                        <p className="text-[10px] font-bold text-gray-600">
                          {Number(plan.total_amount).toLocaleString('fa-IR')}
                        </p>
                        {/* منفی پرداخت‌شده */}
                        <p className="text-[9px] text-green-600">
                          {Number(plan.total_paid || 0).toLocaleString('fa-IR')}-
                        </p>
                        {/* خط */}
                        <div className="border-t border-gray-300 my-0.5"></div>
                        {/* مانده */}
                        <p className={`text-[11px] font-extrabold ${isComplete ? 'text-green-600' : 'text-indigo-600'}`}>
                          {Number((plan.total_amount || 0) - (plan.total_paid || 0)).toLocaleString('fa-IR')}
                        </p>
                      </div>
                      <div className="flex gap-0.5 flex-shrink-0">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingPlan(plan);
                            setEditingAmounts(plan.installments.map(i => ({...i})));
                            setShowEditAmounts(true);
                          }}
                          className="text-blue-500 hover:bg-blue-50 p-1 rounded"
                          title="ویرایش مبالغ اقساط"
                        >
                          <Edit2 size={11} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            deletePlan(plan.id);
                          }}
                          className="text-red-500 hover:bg-red-50 p-1 rounded"
                          title="حذف"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </main>
      
      {/* ═══ مودال ویرایش مشخصات ═══ */}
      {showEditPerson && currentPlan && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-3" onClick={() => setShowEditPerson(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 bg-gradient-to-l from-fuchsia-500 to-fuchsia-600">
              <h3 className="font-bold text-white text-sm">✏️ ویرایش مشخصات</h3>
              <button onClick={() => setShowEditPerson(false)} className="text-white"><X size={18} /></button>
            </div>
            <div className="p-3 overflow-y-auto flex-1 space-y-2">
              <div>
                <label className="text-[10px] text-gray-500 mb-0.5 block">👤 نام *</label>
                <input 
                  value={editPersonName} 
                  onChange={e => setEditPersonName(e.target.value)}
                  className={`w-full px-2 py-1.5 border rounded-lg text-xs ${editPersonErrors.name ? 'border-red-400 bg-red-50' : ''}`} 
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 mb-0.5 block">📱 موبایل *</label>
                <input 
                  value={editPersonPhone} 
                  onChange={e => setEditPersonPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 11))}
                  className={`w-full px-2 py-1.5 border rounded-lg text-xs ${editPersonErrors.phone ? 'border-red-400 bg-red-50' : ''}`} 
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 mb-0.5 block">🆔 کد ملی *</label>
                <input 
                  value={editPersonNid} 
                  onChange={e => setEditPersonNid(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                  className={`w-full px-2 py-1.5 border rounded-lg text-xs ${editPersonErrors.nid ? 'border-red-400 bg-red-50' : ''}`} 
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 mb-0.5 block">📮 کد پستی</label>
                <input 
                  value={editPersonPc} 
                  onChange={e => setEditPersonPc(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                  className="w-full px-2 py-1.5 border rounded-lg text-xs" 
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 mb-0.5 block">🏠 آدرس</label>
                <textarea 
                  value={editPersonAddr} 
                  onChange={e => setEditPersonAddr(e.target.value)}
                  rows={2}
                  className="w-full px-2 py-1.5 border rounded-lg text-xs resize-none" 
                />
              </div>
            </div>
            <div className="p-3 border-t bg-gray-50 flex gap-2">
              <button 
                onClick={async () => {
                  const nameErr = validateName(editPersonName);
                  const phoneErr = validatePhone(editPersonPhone);
                  let nidErr = validateNationalId(editPersonNid);
                  if (!editPersonNid) nidErr = 'کد ملی الزامی است';
                  
                  if (nameErr || phoneErr || nidErr) {
                    setEditPersonErrors({ name: nameErr, phone: phoneErr, nid: nidErr });
                    toast.error(nameErr || phoneErr || nidErr);
                    return;
                  }
                  
                  try {
                    await api.patch(`/shops/installments/${currentPlan.id}/update-person/`, {
                      person_name: editPersonName,
                      person_phone: editPersonPhone,
                      person_national_id: editPersonNid,
                      person_postal_code: editPersonPc,
                      person_address: editPersonAddr,
                    });
                    toast.success('مشخصات ذخیره شد');
                    setShowEditPerson(false);
                    setShowPlan(false);
                    await fetchPlans();
                  } catch (e) {
                    console.error(e);
                    toast.error('خطا در ذخیره');
                  }
                }}
                className="flex-1 bg-fuchsia-500 text-white py-2 rounded-lg text-xs font-bold"
              >
                ✓ ذخیره
              </button>
              <button onClick={() => setShowEditPerson(false)} className="bg-gray-200 text-gray-600 px-4 py-2 rounded-lg text-xs font-bold">انصراف</button>
            </div>
          </div>
        </div>
      )}
      
      {/* ═══ مودال ویرایش مبالغ اقساط ═══ */}
      {showEditAmounts && editingPlan && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3" onClick={() => setShowEditAmounts(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 border-b">
              <h3 className="font-bold text-sm">✏️ ویرایش مبالغ — {editingPlan.person_name}</h3>
              <button onClick={() => setShowEditAmounts(false)} className="text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-3 overflow-y-auto flex-1 space-y-2">
              {editingAmounts.map((inst, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 w-16">قسط {inst.number} (تومان)</span>
                    <input 
                      type="text"
                      dir="ltr"
                      value={inst.amount ? Number(inst.amount).toLocaleString('fa-IR') : ''}
                      onChange={e => {
                        let val = e.target.value
                          .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
                          .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
                          .replace(/[^0-9]/g, '');
                        const updated = [...editingAmounts];
                        updated[idx].amount = val;
                        setEditingAmounts(updated);
                      }}
                      disabled={inst.is_paid}
                      placeholder="تومان"
                      className={`flex-1 px-2 py-1 border rounded text-xs text-left ${inst.is_paid ? 'bg-gray-200 cursor-not-allowed' : ''}`}
                    />
                    {inst.is_paid && <span className="text-[9px] text-green-600">✅</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-gray-400 w-12">📅</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (inst.is_paid) return;
                        setEditDateIndex(idx);
                        setShowEditDatePicker(true);
                      }}
                      disabled={inst.is_paid}
                      className={`flex-1 px-2 py-1 border rounded text-xs text-right bg-white ${
                        inst.is_paid ? 'bg-gray-200 cursor-not-allowed' : 'hover:border-indigo-300'
                      }`}
                    >
                      {inst.due_date_shamsi || 'انتخاب تاریخ'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t bg-gray-50 flex gap-2">
              <button 
                onClick={async () => {
                  try {
                    for (const inst of editingAmounts) {
                      if (!inst.is_paid) {
                        await api.patch(`/shops/installments/${inst.id}/update-amount/`, {
                          amount: Number(inst.amount),
                          due_date_shamsi: inst.due_date_shamsi,
                        });
                      }
                    }
                    toast.success('مبالغ ذخیره شد');
                    setShowEditAmounts(false);
                    await fetchPlans();
                  } catch (e) {
                    console.error(e);
                    toast.error('خطا');
                  }
                }}
                className="flex-1 bg-indigo-500 text-white py-2 rounded-lg text-xs font-bold"
              >
                ✓ ذخیره
              </button>
              <button onClick={() => setShowEditAmounts(false)} className="bg-gray-200 text-gray-600 px-4 py-2 rounded-lg text-xs font-bold">انصراف</button>
            </div>
          </div>
        </div>
      )}
      
      {/* تقویم ویرایش */}
      {showEditDatePicker && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-3" onClick={() => setShowEditDatePicker(false)}>
          <JalaliCalendar
            value={editDateIndex !== null ? editingAmounts[editDateIndex]?.due_date_shamsi : ''}
            onChange={(date) => {
              if (editDateIndex !== null) {
                const updated = [...editingAmounts];
                updated[editDateIndex].due_date_shamsi = date;
                setEditingAmounts(updated);
              }
              setShowEditDatePicker(false);
            }}
            theme="indigo"
          />
        </div>
      )}
      
      {/* ═══ مودال افزودن ═══ */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3" onClick={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* هدر */}
            <div className="flex items-center justify-between p-3 border-b">
              <h3 className="font-bold text-sm">➕ افزودن طرح اقساط</h3>
              <button type="button" onClick={() => setShowForm(false)} className="text-gray-400"><X size={18} /></button>
            </div>
            
            {/* سوییچ حالت */}
            <div className="flex gap-1 p-2 bg-gray-100">
              <button type="button" onClick={() => setFormMode('regular')}
                className={`flex-1 text-[11px] py-1.5 rounded-md ${formMode === 'regular' ? 'bg-white text-indigo-600 font-bold shadow-sm' : 'text-gray-500'}`}>
                📅 اقساط منظم
              </button>
              <button type="button" onClick={() => setFormMode('custom')}
                className={`flex-1 text-[11px] py-1.5 rounded-md ${formMode === 'custom' ? 'bg-white text-indigo-600 font-bold shadow-sm' : 'text-gray-500'}`}>
                ✏️ اقساط دلخواه
              </button>
            </div>
            
            {/* بدنه فرم */}
            <div className="p-3 overflow-y-auto flex-1">
              {/* اطلاعات شخص */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="text-[9px] text-gray-400 mb-0.5 block">👤 نام <span className="text-red-500">*</span></label>
                  <input 
  value={personName} 
  onChange={e => {
    setPersonName(e.target.value);
    if (errors.name) setErrors({...errors, name: validateName(e.target.value)});
  }}
  onBlur={() => setErrors({...errors, name: validateName(personName)})}
  className={`w-full px-2 py-1.5 border rounded-lg text-xs ${
    errors.name ? 'border-red-400 bg-red-50' : 
    personName && !validateName(personName) ? 'border-green-400 bg-green-50' : ''
  }`}
/>
{errors.name && <p className="text-[9px] text-red-500 mt-0.5">⚠️ {errors.name}</p>}
                </div>
                <div>
                  <label className="text-[9px] text-gray-400 mb-0.5 block">📱 موبایل <span className="text-red-500">*</span></label>
                  <input 
  value={personPhone} 
  onChange={e => {
    const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 11);
    setPersonPhone(v);
    if (errors.phone) setErrors({...errors, phone: validatePhone(v)});
  }}
  onBlur={() => setErrors({...errors, phone: validatePhone(personPhone)})}
  className={`w-full px-2 py-1.5 border rounded-lg text-xs ${
    errors.phone ? 'border-red-400 bg-red-50' : 
    personPhone && !validatePhone(personPhone) ? 'border-green-400 bg-green-50' : ''
  }`}
/>
{errors.phone && <p className="text-[9px] text-red-500 mt-0.5">⚠️ {errors.phone}</p>}
                </div>
                <div>
                  <label className="text-[9px] text-gray-400 mb-0.5 block">🆔 کد ملی <span className="text-red-500">*</span></label>
                  <input 
  value={personNationalId} 
  onChange={e => {
    const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
    setPersonNationalId(v);
    if (errors.nid) setErrors({...errors, nid: validateNationalId(v)});
  }}
  onBlur={() => setErrors({...errors, nid: validateNationalId(personNationalId)})}
  className={`w-full px-2 py-1.5 border rounded-lg text-xs ${
    errors.nid ? 'border-red-400 bg-red-50' : 
    personNationalId && !validateNationalId(personNationalId) ? 'border-green-400 bg-green-50' : ''
  }`}
/>
{errors.nid && <p className="text-[9px] text-red-500 mt-0.5">⚠️ {errors.nid}</p>}
                </div>
                <div>
                  <label className="text-[9px] text-gray-400 mb-0.5 block">📮 کد پستی</label>
                  <input 
  value={personPostalCode} 
  onChange={e => {
    const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
    setPersonPostalCode(v);
    if (errors.pc) setErrors({...errors, pc: validatePostalCode(v)});
  }}
  onBlur={() => setErrors({...errors, pc: validatePostalCode(personPostalCode)})}
  className={`w-full px-2 py-1.5 border rounded-lg text-xs ${
    errors.pc ? 'border-red-400 bg-red-50' : 
    personPostalCode && !validatePostalCode(personPostalCode) ? 'border-green-400 bg-green-50' : ''
  }`}
/>
{errors.pc && <p className="text-[9px] text-red-500 mt-0.5">⚠️ {errors.pc}</p>}
                </div>
              </div>
              <div className="mb-3">
                <label className="text-[9px] text-gray-400 mb-0.5 block">🏠 آدرس</label>
                <input value={personAddress} onChange={e => setPersonAddress(e.target.value)} className="w-full px-2 py-1.5 border rounded-lg text-xs" />
              </div>
              
              {formMode === 'regular' ? (
                <>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <label className="text-[9px] text-gray-400 mb-0.5 block">💰 مبلغ کل (تومان) <span className="text-red-500">*</span></label>
                      <input 
  type="text" 
  dir="ltr"
  value={totalAmount ? Number(totalAmount).toLocaleString('fa-IR') : ''} 
  onChange={e => {
    let raw = e.target.value
      .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
      .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
      .replace(/[^0-9]/g, '');
    setTotalAmount(raw);
    setTotalAmountDisplay(raw);
  }} 
  placeholder="تومان"
  className="w-full px-2 py-1.5 border rounded-lg text-xs text-left" 
/>
                    </div>
                    <div>
                      <label className="text-[9px] text-gray-400 mb-0.5 block">🔢 تعداد اقساط <span className="text-red-500">*</span></label>
                      <select value={installmentCount} onChange={e => setInstallmentCount(e.target.value)} className="w-full px-2 py-1.5 border rounded-lg text-xs bg-white">
                        <option value="">انتخاب...</option>
                        {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => <option key={n} value={n}>{n} قسط</option>)}
                      </select>
                    </div>
                  </div>
                  
                  {/* پیش‌نمایش اقساط */}
                  {previewInstallments.length > 0 && (
                    <div className="bg-indigo-50 rounded-lg p-2 mb-3">
                      <p className="text-[10px] text-indigo-600 font-bold mb-1.5">📋 پیش‌نمایش اقساط:</p>
                      <div className="space-y-1">
                        {previewInstallments.map((inst, i) => (
                          <div key={i} className="flex items-center justify-between text-[10px] bg-white rounded px-2 py-1">
                            <span className="text-gray-500">قسط {inst.number}</span>
                            <span className="text-gray-500">{inst.due_date_shamsi}</span>
                            <span className="font-bold text-indigo-600">{Number(inst.amount).toLocaleString('fa-IR')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* اقساط دلخواه */}
                  <label className="text-[9px] text-gray-400 mb-1 block">📋 لیست اقساط</label>
                  <div className="space-y-2 mb-2">
                    {customInstallments.map((inst, idx) => (
                      <div key={idx} className="bg-gray-50 rounded-lg p-2">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] text-gray-500">قسط {idx + 1} (تومان)</span>
                          {customInstallments.length > 1 && (
                            <button type="button" onClick={() => setCustomInstallments(customInstallments.filter((_, i) => i !== idx))}
                              className="text-red-500 text-[10px]">🗑️</button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-1">
                          <input 
                            type="text"
                            dir="ltr"
                            value={inst.amount ? Number(inst.amount).toLocaleString('fa-IR') : ''}
                            onChange={e => {
                              let raw = e.target.value
                                .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
                                .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
                                .replace(/[^0-9]/g, '');
                              const updated = [...customInstallments];
                              updated[idx].amount = raw;
                              updated[idx].amountDisplay = raw;
                              setCustomInstallments(updated);
                            }}
                            placeholder="تومان"
                            className="px-2 py-1.5 border rounded-lg text-xs text-left"
                          />
                          <button type="button" onClick={() => { setPickerTarget(`custom_${idx}`); setShowDatePicker(true); }}
                            className="px-2 py-1.5 border rounded-lg text-xs text-right bg-white">
                            📅 {inst.due_date_shamsi || 'سررسید'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {customInstallments.length < 12 && (
                    <button type="button" 
                      onClick={() => setCustomInstallments([...customInstallments, { amount: '', amountDisplay: '', due_date_shamsi: '' }])}
                      className="w-full text-[10px] py-1.5 rounded-lg bg-indigo-50 text-indigo-600 font-bold mb-3">
                      ➕ افزودن قسط جدید
                    </button>
                  )}
                </>
              )}
              
              {/* نحوه پرداخت */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="text-[9px] text-gray-400 mb-0.5 block">💳 نحوه پرداخت *</label>
                  <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full px-2 py-1.5 border rounded-lg text-xs bg-white">
                    <option value="check">چک</option>
                    <option value="cash">نقد</option>
                    <option value="other">سایر</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] text-gray-400 mb-0.5 block">📋 تضمینات *</label>
                  <select value={guarantee} onChange={e => setGuarantee(e.target.value)} className="w-full px-2 py-1.5 border rounded-lg text-xs bg-white">
                    <option value="check">چک</option>
                    <option value="surety">سفته</option>
                    <option value="other">سایر</option>
                  </select>
                </div>
              </div>
              
              {/* فیلدهای اضافی نحوه پرداخت (چک) */}
              {paymentMethod === 'check' && (
                <div className="bg-gray-50 rounded-lg p-2 mb-2">
                  <p className="text-[10px] text-gray-500 mb-1.5">💳 اطلاعات چک (پرداخت)</p>
                  <input 
                    value={checkSerial}
                    onChange={e => setCheckSerial(e.target.value)}
                    placeholder="شماره سریال چک"
                    className="w-full px-2 py-1.5 border rounded-lg text-xs mb-1"
                  />
                  <input 
                    value={checkNotes}
                    onChange={e => setCheckNotes(e.target.value)}
                    placeholder="شرح چک"
                    className="w-full px-2 py-1.5 border rounded-lg text-xs"
                  />
                </div>
              )}
              
              {/* فیلدهای اضافی تضمینات (چک یا سفته) */}
              {(guarantee === 'check' || guarantee === 'surety') && (
                <div className="bg-gray-50 rounded-lg p-2 mb-2">
                  <p className="text-[10px] text-gray-500 mb-1.5">
                    {guarantee === 'check' ? '📋 اطلاعات چک (تضمین)' : '📋 اطلاعات سفته'}
                  </p>
                  <input 
                    value={guaranteeSerial}
                    onChange={e => setGuaranteeSerial(e.target.value)}
                    placeholder="شماره سریال"
                    className="w-full px-2 py-1.5 border rounded-lg text-xs mb-1"
                  />
                  <input 
                    value={guaranteeNotes}
                    onChange={e => setGuaranteeNotes(e.target.value)}
                    placeholder="شرح"
                    className="w-full px-2 py-1.5 border rounded-lg text-xs"
                  />
                </div>
              )}
            </div>
            
            {/* دکمه‌ها */}
            <div className="p-3 border-t bg-gray-50 flex gap-2">
              <button type="submit" className="flex-1 bg-indigo-500 text-white py-2 rounded-lg text-xs font-bold">✓ ثبت</button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-600 px-4 py-2 rounded-lg text-xs font-bold">انصراف</button>
            </div>
          </form>
        </div>
      )}
      
      {/* ═══ مودال نمایش اقساط ═══ */}
      {showPlan && currentPlan && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3" onClick={() => setShowPlan(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            {/* هدر */}
            <div className="flex items-center justify-between p-3 bg-gradient-to-l from-indigo-500 to-indigo-600">
              <button 
                onClick={() => {
                  setEditPersonName(currentPlan.person_name || '');
                  setEditPersonPhone(currentPlan.person_phone || '');
                  setEditPersonNid(currentPlan.person_national_id || '');
                  setEditPersonPc(currentPlan.person_postal_code || '');
                  setEditPersonAddr(currentPlan.person_address || '');
                  setEditPersonErrors({});
                  setShowEditPerson(true);
                }}
                className="font-bold text-white text-sm hover:underline"
                title="ویرایش مشخصات"
              >
                💳 {currentPlan.person_name}
              </button>
              <button onClick={() => setShowPlan(false)} className="text-white"><X size={18} /></button>
            </div>
            
            {/* اطلاعات */}
            <div className="p-3 bg-gray-50 border-b space-y-1 text-[10px]">
              <div className="flex justify-between"><span className="text-gray-500">📱 موبایل:</span><span className="font-bold">{currentPlan.person_phone}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">💰 مبلغ کل:</span><span className="font-bold text-indigo-600">{Number(currentPlan.total_amount).toLocaleString('fa-IR')}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">🔢 تعداد:</span><span>{currentPlan.total_installments} قسط</span></div>
              <div className="flex justify-between"><span className="text-gray-500">💳 پرداخت:</span><span>{currentPlan.payment_method_display}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">📋 تضمین:</span><span>{currentPlan.guarantee_display}</span></div>
            </div>
            
            {/* لیست اقساط */}
            <div className="overflow-y-auto flex-1 p-3">
              <table className="w-full text-[10px]">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 text-center w-8">#</th>
                    <th className="p-2 text-center">سررسید</th>
                    <th className="p-2 text-center">مبلغ</th>
                    <th className="p-2 text-center w-12">پرداخت</th>
                  </tr>
                </thead>
                <tbody>
                  {currentPlan.installments?.map((inst, idx) => (
                    <tr key={inst.id || idx} className={`border-b ${inst.is_overdue && !inst.is_paid ? 'bg-red-50' : ''}`}>
                      <td className="p-2 text-center text-gray-500">{inst.number}</td>
                      <td className={`p-2 text-center ${inst.is_overdue && !inst.is_paid ? 'text-red-500 animate-pulse font-bold' : ''}`}>
                        {inst.due_date_shamsi}
                      </td>
                      <td className={`p-2 text-center font-bold ${inst.is_paid ? 'text-green-600' : 'text-gray-700'}`}>
                        {Number(inst.amount).toLocaleString('fa-IR')}
                      </td>
                      <td className="p-2 text-center">
                        <input 
                          type="checkbox"
                          checked={inst.is_paid}
                          onChange={() => togglePaid(inst.id)}
                          className="cursor-pointer w-4 h-4"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-indigo-50">
                  <tr>
                    <td colSpan="2" className="p-2 text-left font-bold text-gray-600">جمع پرداخت‌نشده:</td>
                    <td colSpan="2" className="p-2 text-center font-extrabold text-indigo-600">
                      {Number((currentPlan.total_amount || 0) - (currentPlan.total_paid || 0)).toLocaleString('fa-IR')} تومان
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
      
      {/* تقویم */}
      {showDatePicker && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-3" onClick={() => setShowDatePicker(false)}>
          <JalaliCalendar
            value=""
            onChange={(date) => {
              if (pickerTarget && pickerTarget.startsWith('custom_')) {
                const idx = parseInt(pickerTarget.split('_')[1]);
                
                // validation: تاریخ نباید قبل از امروز باشه
                const today = new Date();
                const j = jalaali.toJalaali(today.getFullYear(), today.getMonth() + 1, today.getDate());
                const todayStr = j.jy + '/' + String(j.jm).padStart(2, '0') + '/' + String(j.jd).padStart(2, '0');
                
                if (date < todayStr) {
                  toast.error('تاریخ نمی‌تواند قبل از امروز باشد');
                  setShowDatePicker(false);
                  return;
                }
                
                // validation: قسط جدید باید بعد از قسط قبلی باشه
                if (idx > 0) {
                  const prevDate = customInstallments[idx - 1].due_date_shamsi;
                  if (prevDate && date <= prevDate) {
                    toast.error('تاریخ باید بعد از قسط قبلی باشد');
                    setShowDatePicker(false);
                    return;
                  }
                }
                
                const updated = [...customInstallments];
                updated[idx].due_date_shamsi = date;
                setCustomInstallments(updated);
              }
              setShowDatePicker(false);
            }}
            theme="indigo"
          />
        </div>
      )}
    </div>
  );
}
