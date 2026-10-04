import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, X, Search, Trash2, Edit2, Wallet, Users } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../services/api';
import * as jalaali from 'jalaali-js';

const PRESET_DEBTS = [
  { title: 'فروش نسیه', icon: '💰', debt_type: 'debtor' },
  { title: 'چک دریافتی', icon: '📝', debt_type: 'debtor' },
  { title: 'خرید نسیه', icon: '🏭', debt_type: 'creditor' },
  { title: 'اجاره', icon: '🏠', debt_type: 'creditor' },
  { title: 'قبض', icon: '📄', debt_type: 'creditor' },
  { title: 'قرض', icon: '🎁', debt_type: 'debtor' },
];

const persianMonthNames = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

export default function DebtsPage() {
  const [searchParams] = useSearchParams();
  const [shops, setShops] = useState([]);
  const [selectedShop, setSelectedShop] = useState(searchParams.get('shop') || 'all');
  
  const [debts, setDebts] = useState([]);
  const [summary, setSummary] = useState({});
  const [persons, setPersons] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // فرم
  const [debtType, setDebtType] = useState('debtor');
  const [personName, setPersonName] = useState('');
  const [personPhone, setPersonPhone] = useState('');
  const [personNationalId, setPersonNationalId] = useState('');
  const [personAddress, setPersonAddress] = useState('');
  const [personPostalCode, setPersonPostalCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [shebaNumber, setShebaNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [amountDisplay, setAmountDisplay] = useState('');
  const [transactionDate, setTransactionDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [paymentType, setPaymentType] = useState('credit');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({ phone: '', nationalId: '', postalCode: '', cardNumber: '', sheba: '' });
  
  // فیلترها
  const [filterTab, setFilterTab] = useState('date');
  const [dueFilterType, setDueFilterType] = useState('all');
  const [dueSearch, setDueSearch] = useState('');
  const [dueSort, setDueSort] = useState('desc');
  const [dueView, setDueView] = useState('week');  // week | month
  const [showDueSuggestions, setShowDueSuggestions] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [personDebts, setPersonDebts] = useState([]);
  const [personSort, setPersonSort] = useState('desc'); // desc | asc
  const [personSortBy, setPersonSortBy] = useState('date'); // date | due // date | persons | overdue
  const [searchPerson, setSearchPerson] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [sortOrder, setSortOrder] = useState('asc');  // asc | desc // all | debtor | creditor
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // تقویم
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerTarget, setPickerTarget] = useState('');
  const [pickerYear, setPickerYear] = useState(1405);
  const [pickerMonth, setPickerMonth] = useState(1);
  
  const getDaysInMonth = (jy, jm) => jalaali.jalaaliMonthLength(jy, jm);
  
  const persianToNumber = (persianDate) => {
    if (!persianDate) return 0;
    const parts = persianDate.split('/');
    if (parts.length !== 3) return 0;
    return parseInt(parts[0]) * 10000 + parseInt(parts[1]) * 100 + parseInt(parts[2]);
  };
  
  const todayPersian = () => {
    const g = new Date();
    const j = jalaali.toJalaali(g.getFullYear(), g.getMonth() + 1, g.getDate());
    return `${j.jy}/${String(j.jm).padStart(2, '0')}/${String(j.jd).padStart(2, '0')}`;
  };
  
  const openPicker = (target) => {
    setPickerTarget(target);
    setShowDatePicker(true);
  };
  
  const selectDay = (day) => {
    const dateStr = `${pickerYear}/${String(pickerMonth).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
    const num = persianToNumber(dateStr);
    
    if (pickerTarget === 'transaction') {
      setTransactionDate(dateStr);
    } else if (pickerTarget === 'due') {
      if (transactionDate && persianToNumber(transactionDate) > num) {
        toast.error('تاریخ سررسید نمی‌تواند قبل از تاریخ تراکنش باشد');
        return;
      }
      setDueDate(dateStr);
    } else if (pickerTarget === 'filter_from') {
      if (dateTo && persianToNumber(dateTo) < num) {
        setDateTo('');
      }
      setDateFrom(dateStr);
    } else if (pickerTarget === 'filter_to') {
      if (dateFrom && persianToNumber(dateFrom) > num) {
        toast.error('تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد');
        return;
      }
      setDateTo(dateStr);
    }
    setShowDatePicker(false);
  };
  
  // گرفتن داده
  const sortPersonDebts = (items, order, by = 'date') => {
    return [...items].sort((a, b) => {
      const da = by === 'due' ? (a.due_date_shamsi || '') : (a.transaction_date_shamsi || a.transaction_date || '');
      const db = by === 'due' ? (b.due_date_shamsi || '') : (b.transaction_date_shamsi || b.transaction_date || '');
      if (by === 'due') {
        if (!da && db) return 1;
        if (da && !db) return -1;
        if (!da && !db) return 0;
      }
      return order === 'asc' ? da.localeCompare(db) : db.localeCompare(da);
    });
  };
  
  const changePersonSortBy = (by, order) => {
    setPersonSortBy(by);
    setPersonSort(order);
    setPersonDebts(prev => sortPersonDebts(prev, order, by));
  };
  
  const [returnToPerson, setReturnToPerson] = useState(null);
  
  const startNewEventForPerson = (person) => {
    // ذخیره شخص برای برگشت
    setReturnToPerson(person);
    // مشخصات ثابت شخص
    setDebtType(person.debt_type || 'debtor');
    setPersonName(person.person_name);
    setPersonPhone(person.person_phone);
    setPersonNationalId(person.person_national_id || '');
    setPersonAddress(person.person_address || '');
    setPersonPostalCode(person.person_postal_code || '');
    setBankName(person.bank_name || '');
    setCardNumber(person.card_number || '');
    setShebaNumber(person.sheba_number || '');
    // فیلدهای متغیر خالی
    setAmount(''); setAmountDisplay('');
    setTransactionDate(todayPersian()); setDueDate('');
    setPaymentType('credit'); setNotes('');
    setErrors({ phone: '', nationalId: '', postalCode: '', cardNumber: '', sheba: '' });
    setEditingId(null);
    setSelectedPerson(null);
    setShowForm(true);
  };
  
  const lookupPersonByNid = async (nid) => {
    if (!nid || nid.length !== 10) return;
    try {
      const res = await api.get(`/shops/debts/person/?nid=${nid}`);
      if (res.data.found && res.data.person) {
        const p = res.data.person;
        setPersonName(p.person_name || '');
        setPersonPhone(p.person_phone || '');
        setPersonAddress(p.person_address || '');
        setPersonPostalCode(p.person_postal_code || '');
        setBankName(p.bank_name || '');
        setCardNumber(p.card_number || '');
        setShebaNumber(p.sheba_number || '');
        toast.success(`مشخصات ${p.person_name} بارگذاری شد`);
      }
    } catch (e) {
      console.error(e);
    }
  };
  
  const openPerson = (personName) => {
    const personItems = debts.filter(d => d.person_name === personName);
    
    // پیدا کردن آخرین تراکنشی که هر فیلد رو پر کرده
    const mergedPerson = {
      person_name: personName,
      person_phone: '',
      person_national_id: '',
      person_address: '',
      person_postal_code: '',
      bank_name: '',
      card_number: '',
      sheba_number: '',
      debt_type: 'debtor',
    };
    
    // از جدیدترین به قدیمی‌ترین بگرد و اولین مقدار غیرخالی رو بردار
    const sorted = [...personItems].sort((a, b) => 
      (b.transaction_date || '').localeCompare(a.transaction_date || '')
    );
    
    for (const item of sorted) {
      if (!mergedPerson.person_phone && item.person_phone) mergedPerson.person_phone = item.person_phone;
      if (!mergedPerson.person_national_id && item.person_national_id) mergedPerson.person_national_id = item.person_national_id;
      if (!mergedPerson.person_address && item.person_address) mergedPerson.person_address = item.person_address;
      if (!mergedPerson.person_postal_code && item.person_postal_code) mergedPerson.person_postal_code = item.person_postal_code;
      if (!mergedPerson.bank_name && item.bank_name) mergedPerson.bank_name = item.bank_name;
      if (!mergedPerson.card_number && item.card_number) mergedPerson.card_number = item.card_number;
      if (!mergedPerson.sheba_number && item.sheba_number) mergedPerson.sheba_number = item.sheba_number;
    }
    
    // debt_type از آخرین تراکنش
    mergedPerson.debt_type = sorted[0]?.debt_type || 'debtor';
    
    setSelectedPerson(mergedPerson);
    setPersonDebts(sortPersonDebts(personItems, 'asc', 'date'));
    setPersonSort('asc');
    setPersonSortBy('date');
  };
  
  const fetchDebts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedShop !== 'all') params.append('shop_id', selectedShop);
      if (filterType !== 'all') params.append('debt_type', filterType);
      if (searchPerson) params.append('person_name', searchPerson);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      if (filterTab === 'overdue') params.append('overdue', 'true');
      params.append('sort', sortOrder);  // asc | desc
      
      const res = await api.get(`/shops/debts/?${params.toString()}`);
      setDebts(res.data.debts || []);
      setSummary(res.data.summary || {});
      setPersons(res.data.persons || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };
  
  useEffect(() => {
    api.get('/shops/my/').then(r => setShops(r.data || [])).catch(() => {});
  }, []);
  
  useEffect(() => {
    fetchDebts();
  }, [selectedShop, filterType, dateFrom, dateTo, filterTab]);
  
  // فرمت قیمت
  const formatPrice = (val) => {
    const num = String(val).replace(/\D/g, '');
    return num ? Number(num).toLocaleString('fa-IR') : '';
  };
  
  const handleAmountChange = (e) => {
    // تبدیل اعداد فارسی/عربی به انگلیسی + حذف غیرعددی
    const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
    const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
    let raw = e.target.value
      .replace(/[۰-۹]/g, d => persianDigits.indexOf(d))
      .replace(/[٠-٩]/g, d => arabicDigits.indexOf(d))
      .replace(/[^0-9]/g, '');
    
    setAmount(raw);
    setAmountDisplay(raw ? Number(raw).toLocaleString('en-US') : '');
  };
  
  const resetForm = () => {
    setDebtType('debtor');
    setPersonName(''); setPersonPhone(''); setPersonNationalId('');
    setPersonAddress(''); setPersonPostalCode('');
    setBankName(''); setCardNumber(''); setShebaNumber('');
    setAmount(''); setAmountDisplay('');
    setTransactionDate(todayPersian()); setDueDate('');
    setPaymentType('credit'); setNotes('');
    setErrors({ phone: '', nationalId: '', postalCode: '', cardNumber: '', sheba: '' });
  };
  
  useEffect(() => {
    if (!showForm) return;
    if (!editingId) setTransactionDate(todayPersian());
  }, [showForm, editingId]);
  
  // ثبت/ویرایش
  // ═══ توابع اعتبارسنجی ═══
  const validatePhone = (val) => {
    if (!val) return 'شماره موبایل الزامی است';
    if (!/^09[0-9]{9}$/.test(val)) return 'شماره باید با 09 شروع شده و ۱۱ رقم باشد';
    return '';
  };
  
  const validateNationalId = (val) => {
    if (!val) return '';  // اختیاری
    if (!/^[0-9]{10}$/.test(val)) return 'کد ملی باید ۱۰ رقم باشد';
    
    // کدهای تکراری (1111111111, 2222222222, ...)
    if (/^(\d)\1{9}$/.test(val)) return 'کد ملی نامعتبر است';
    
    // الگوریتم چک‌سام کد ملی ایران
    const check = parseInt(val[9]);
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(val[i]) * (10 - i);
    }
    const remainder = sum % 11;
    
    const isValid = (remainder < 2 && check === remainder) || 
                    (remainder >= 2 && check === 11 - remainder);
    
    if (!isValid) return 'کد ملی نامعتبر است';
    return '';
  };
  
  const validatePostalCode = (val) => {
    if (!val) return '';  // اختیاری
    if (!/^[0-9]{10}$/.test(val)) return 'کد پستی باید ۱۰ رقم باشد';
    return '';
  };
  
  // ═══ تشخیص نام بانک از روی شماره کارت ═══
  const banksByCardPrefix = {
    '603799': 'بانک ملی',
    '610433': 'بانک ملت',
    '627412': 'بانک اقتصاد نوین',
    '627381': 'بانک انصار',
    '505785': 'بانک ایران زمین',
    '636214': 'بانک آینده',
    '627648': 'بانک توسعه صادرات',
    '627760': 'پست بانک',
    '502908': 'بانک توسعه تعاون',
    '622106': 'بانک پارسیان',
    '502229': 'بانک پاسارگاد',
    '639347': 'بانک پاسارگاد',
    '627884': 'بانک دی',
    '639346': 'بانک سینا',
    '627353': 'بانک صادرات',
    '603769': 'بانک صادرات',
    '502806': 'بانک شهر',
    '504706': 'بانک شهر',
    '603786': 'بانک سامان',
    '621986': 'بانک سامان',
    '639607': 'بانک سپه',
    '589210': 'بانک سپه',
    '639370': 'بانک مهر ایران',
    '628023': 'بانک مسکن',
    '627961': 'بانک صنعت و معدن',
    '639217': 'بانک کشاورزی',
    '603770': 'بانک کشاورزی',
    '628157': 'بانک قوامین',
    '639599': 'بانک قوامین',
    '585983': 'بانک قرض‌الحسنه رسالت',
    '504172': 'بانک قرض‌الحسنه مهر',
    '606373': 'بانک قرض‌الحسنه مهر',
    '636795': 'بانک مرکزی',
  };
  
  // ═══ تشخیص نام بانک از روی شبا (۳ رقم اول) ═══
  const banksByShebaCode = {
    '017': 'بانک ملی',
    '012': 'بانک ملت',
    '018': 'بانک تجارت',
    '013': 'بانک رفاه',
    '015': 'بانک صادرات',
    '016': 'بانک کشاورزی',
    '019': 'بانک صادرات',
    '011': 'بانک صنعت و معدن',
    '021': 'پست بانک',
    '054': 'بانک پارسیان',
    '057': 'بانک پاسارگاد',
    '058': 'بانک سامان',
    '059': 'بانک سینا',
    '061': 'بانک شهر',
    '062': 'بانک آینده',
    '063': 'بانک اقتصاد نوین',
    '055': 'بانک سپه',
    '056': 'بانک مسکن',
  };
  
  const detectBankFromCard = (cardNum) => {
    if (!cardNum || cardNum.length < 6) return '';
    const prefix = cardNum.substring(0, 6);
    return banksByCardPrefix[prefix] || '';
  };
  
  const detectBankFromSheba = (sheba) => {
    if (!sheba || sheba.length < 3) return '';
    const code = sheba.substring(0, 3);
    return banksByShebaCode[code] || '';
  };

  // ═══ اعتبارسنجی شماره کارت (الگوریتم Luhn) ═══
  const validateCardNumber = (val) => {
    if (!val) return '';  // اختیاری
    if (!/^[0-9]{16}$/.test(val)) return 'شماره کارت باید ۱۶ رقم باشد';
    
    // چک پیش‌شماره بانک (۶ رقم اول)
    const prefix = val.substring(0, 6);
    if (!banksByCardPrefix[prefix]) {
      return 'پیش‌شماره کارت (۶ رقم اول) متعلق به هیچ بانکی نیست';
    }
    return '';
  };
  
  // ═══ اعتبارسنجی شبا (مود ۹۷) ═══
  const validateSheba = (val) => {
    if (!val) return '';  // اختیاری
    if (!/^[0-9]{24}$/.test(val)) return 'شبا باید ۲۴ رقم باشد (بدون IR)';
    
    // چک کد بانک (۳ رقم اول)
    const code = val.substring(0, 3);
    if (!banksByShebaCode[code]) {
      return 'کد بانک (۳ رقم اول شبا) متعلق به هیچ بانکی نیست';
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // ═══ اعتبارسنجی ═══
    if (!personName || personName.trim().length < 2) {
      toast.error('نام باید حداقل ۲ حرف باشد');
      return;
    }
    
    if (!personPhone) {
      toast.error('شماره موبایل الزامی است');
      return;
    }
    
    // چک نهایی با توابع
    const phoneErr = validatePhone(personPhone);
    const nidErr = validateNationalId(personNationalId);
    const pcErr = validatePostalCode(personPostalCode);
    const cardErr = debtType === 'creditor' ? validateCardNumber(cardNumber) : '';
    const shebaErr = debtType === 'creditor' ? validateSheba(shebaNumber) : '';
    
    if (phoneErr || nidErr || pcErr || cardErr || shebaErr) {
      setErrors({ 
        phone: phoneErr, 
        nationalId: nidErr, 
        postalCode: pcErr,
        cardNumber: cardErr,
        sheba: shebaErr,
      });
      toast.error(phoneErr || nidErr || pcErr || cardErr || shebaErr);
      return;
    }
    
    // مبلغ: باید عدد مثبت باشه
    if (!amount || Number(amount) <= 0) {
      toast.error('مبلغ باید بیشتر از صفر باشد');
      return;
    }
    
    // اگه شبا پر شده، نام بانک اجباریه
    if (debtType === 'creditor' && shebaNumber && !bankName.trim()) {
      toast.error('اگه شماره شبا وارد شود، نام بانک الزامی است');
      return;
    }
    
    try {
      const payload = {
        debt_type: debtType,
        person_name: personName,
        person_phone: personPhone,
        person_national_id: personNationalId,
        person_address: personAddress,
        person_postal_code: personPostalCode,
        bank_name: bankName,
        card_number: cardNumber,
        sheba_number: shebaNumber,
        amount,
        transaction_date: transactionDate || todayPersian(),
        due_date: dueDate || null,
        payment_type: paymentType,
        notes,
      };
      if (selectedShop && selectedShop !== 'all') payload.shop = selectedShop;
      
      if (editingId) {
        await api.patch(`/shops/debts/${editingId}/`, payload);
        toast.success('ویرایش شد');
      } else {
        await api.post('/shops/debts/create/', payload);
        toast.success('ثبت شد');
      }
      setShowForm(false);
      setEditingId(null);
      resetForm();
      
      // دیتای تازه رو بگیر
      const savedPerson = returnToPerson;
      setReturnToPerson(null);
      
      // ═══ fetch کامل با همه stateها ═══
      try {
        const params = new URLSearchParams();
        if (selectedShop !== 'all') params.append('shop_id', selectedShop);
        if (filterType !== 'all') params.append('debt_type', filterType);
        if (searchPerson) params.append('person_name', searchPerson);
        if (dateFrom) params.append('date_from', dateFrom);
        if (dateTo) params.append('date_to', dateTo);
        if (filterTab === 'overdue') params.append('overdue', 'true');
        params.append('sort', sortOrder);
        
        const res = await api.get(`/shops/debts/?${params.toString()}`);
        const freshDebts = res.data.debts || [];
        
        // ═══ آپدیت همه stateها ═══
        setDebts(freshDebts);
        setSummary(res.data.summary || {});
        setPersons(res.data.persons || []);
        
        // اگه از مودال شخص اومده بودیم، دوباره بازش کن
        if (savedPerson) {
          const personItems = freshDebts.filter(d => d.person_name === savedPerson.person_name);
          if (personItems.length > 0) {
            setSelectedPerson(personItems[0]);
            setPersonDebts(sortPersonDebts(personItems, 'asc', 'date'));
          }
        }
      } catch (e) {
        console.error(e);
        await fetchDebts();
      }
    } catch (err) { 
      console.error(err);
      const errorMsg = err?.response?.data?.error || 'خطا در ثبت';
      toast.error(errorMsg);
    }
  };
  
  const handleEdit = (debt) => {
    setEditingId(debt.id);
    setDebtType(debt.debt_type);
    setPersonName(debt.person_name);
    setPersonPhone(debt.person_phone);
    setPersonNationalId(debt.person_national_id || '');
    setPersonAddress(debt.person_address || '');
    setPersonPostalCode(debt.person_postal_code || '');
    setBankName(debt.bank_name || '');
    setCardNumber(debt.card_number || '');
    setShebaNumber(debt.sheba_number || '');
    setAmount(debt.amount);
    setAmountDisplay(Number(debt.amount).toLocaleString('fa-IR'));
    // ═══ استفاده از تاریخ شمسی ═══
    setTransactionDate(debt.transaction_date_shamsi || debt.transaction_date);
    setDueDate(debt.due_date_shamsi || debt.due_date || '');
    setPaymentType(debt.payment_type);
    setNotes(debt.notes || '');
    setErrors({ phone: '', nationalId: '', postalCode: '', cardNumber: '', sheba: '' });
    setShowForm(true);
  };
  
  const handleDelete = async (id) => {
    try {
      await api.delete(`/shops/debts/${id}/delete/`);
      toast.success('حذف شد');
      
      // قبل از fetch، بررسی کن که رکورد دیگه‌ای برای این شخص مونده یا نه
      const currentPersonName = selectedPerson?.person_name;
      
      // فیلتر دیتای جاری بدون این رکورد
      const remainingDebts = debts.filter(d => d.id !== id);
      const remainingForPerson = currentPersonName 
        ? remainingDebts.filter(d => d.person_name === currentPersonName)
        : [];
      
      // آپدیت state
      setDebts(remainingDebts);
      
      if (selectedPerson) {
        if (remainingForPerson.length === 0) {
          // هیچ رکوردی نمونده → مودال رو ببند
          setSelectedPerson(null);
          setPersonDebts([]);
        } else {
          // رکورد مونده → آپدیت کن
          setSelectedPerson(remainingForPerson[0]);
          setPersonDebts(sortPersonDebts(remainingForPerson, 'asc', 'date'));
        }
      }
      
      // بعد fetch کن
      await fetchDebts();
      
    } catch (e) { 
      console.error(e);
      toast.error(e?.response?.data?.error || 'خطا در حذف'); 
    }
  };
  
  // ═══ پیشنهادات جستجو ═══
  const suggestions = searchPerson.length >= 2 
    ? debts
        .filter(d => 
          d.person_name?.toLowerCase().includes(searchPerson.toLowerCase()) ||
          d.person_phone?.includes(searchPerson) ||
          d.person_national_id?.includes(searchPerson)
        )
        .reduce((acc, d) => {
          // یکتا کردن بر اساس نام
          if (!acc.find(p => p.person_name === d.person_name)) {
            const personDebts = debts.filter(x => x.person_name === d.person_name);
            const debtorTotal = personDebts.filter(x => x.debt_type === 'debtor').reduce((s, x) => s + Number(x.amount), 0);
            const creditorTotal = personDebts.filter(x => x.debt_type === 'creditor').reduce((s, x) => s + Number(x.amount), 0);
            acc.push({
              person_name: d.person_name,
              person_phone: d.person_phone,
              balance: debtorTotal - creditorTotal,
            });
          }
          return acc;
        }, [])
        .slice(0, 8)
    : [];
  
  // ═══ تراکنش‌های بدون سررسید ═══
  const noDueTransactions = (() => {
    let filtered = debts.filter(d => !d.due_date_shamsi);
    
    if (dueFilterType === 'debtor') {
      filtered = filtered.filter(d => d.debt_type === 'debtor');
    } else if (dueFilterType === 'creditor') {
      filtered = filtered.filter(d => d.debt_type === 'creditor');
    }
    
    if (dueSearch.length >= 2) {
      const q = dueSearch.toLowerCase();
      filtered = filtered.filter(d => 
        d.person_name?.toLowerCase().includes(q) ||
        d.person_phone?.includes(dueSearch) ||
        d.person_national_id?.includes(dueSearch)
      );
    }
    
    return filtered;
  })();
  
  // ═══ لیست تراکنش‌ها بر اساس سررسید ═══
  const dueTransactions = (() => {
    let filtered = [...debts];
    
    // فقط تراکنش‌هایی که سررسید دارن
    filtered = filtered.filter(d => d.due_date_shamsi);
    
    // فیلتر نوع
    if (dueFilterType === 'debtor') {
      filtered = filtered.filter(d => d.debt_type === 'debtor');
    } else if (dueFilterType === 'creditor') {
      filtered = filtered.filter(d => d.debt_type === 'creditor');
    }
    
    // جستجو
    if (dueSearch.length >= 2) {
      const q = dueSearch.toLowerCase();
      filtered = filtered.filter(d => 
        d.person_name?.toLowerCase().includes(q) ||
        d.person_phone?.includes(dueSearch) ||
        d.person_national_id?.includes(dueSearch)
      );
    }
    
    // مرتب‌سازی
    filtered.sort((a, b) => {
      const da = (a.due_date_shamsi || '').replace(/\//g, '');
      const db = (b.due_date_shamsi || '').replace(/\//g, '');
      return dueSort === 'asc' 
        ? parseInt(da) - parseInt(db)
        : parseInt(db) - parseInt(da);
    });
    
    return filtered;
  })();
  
  // ═══ گرفتن today ═══
  const todayShamsi = (() => {
    try {
      const today = new Date();
      const j = jalaali.toJalaali(today.getFullYear(), today.getMonth() + 1, today.getDate());
      return `${j.jy}/${String(j.jm).padStart(2, '0')}/${String(j.jd).padStart(2, '0')}`;
    } catch (e) { return ''; }
  })();
  
  // ═══ گروه‌بندی هفتگی (جاری تا آخر سال) ═══
  const weekGroups = (() => {
    const groups = {};
    
    const today = new Date();
    const todayJ = jalaali.toJalaali(today.getFullYear(), today.getMonth() + 1, today.getDate());
    
    dueTransactions.forEach(d => {
      if (!d.due_date_shamsi) return;
      if (d.due_date_shamsi < todayShamsi) return;
      
      const parts = d.due_date_shamsi.split('/').map(Number);
      const diffDays = ((parts[0] - todayJ.jy) * 365) + ((parts[1] - todayJ.jm) * 30) + (parts[2] - todayJ.jd);
      const weekIndex = Math.max(0, Math.floor(diffDays / 7));
      const weekKey = `W${weekIndex}`;
      
      if (!groups[weekKey]) {
        groups[weekKey] = {
          key: weekKey,
          weekIndex: weekIndex,
          transactions: [],
          from: d.due_date_shamsi,
          to: d.due_date_shamsi,
          debtorTotal: 0,
          creditorTotal: 0,
        };
      }
      
      groups[weekKey].transactions.push(d);
      if (d.due_date_shamsi < groups[weekKey].from) groups[weekKey].from = d.due_date_shamsi;
      if (d.due_date_shamsi > groups[weekKey].to) groups[weekKey].to = d.due_date_shamsi;
      
      if (d.debt_type === 'debtor') {
        groups[weekKey].debtorTotal += Number(d.amount);
      } else {
        groups[weekKey].creditorTotal += Number(d.amount);
      }
    });
    
    // نام‌گذاری: هفته جاری، هفته آینده، بعد هفته اول/دوم/سوم/چهارم ماه
    const sorted = Object.values(groups).sort((a, b) => a.weekIndex - b.weekIndex);
    
    sorted.forEach((g, idx) => {
      if (idx === 0) {
        g.weekLabel = '📌 هفته جاری';
      } else if (idx === 1) {
        g.weekLabel = '📌 هفته آینده';
      } else {
        // محاسبه ماه و شماره هفته در ماه
        const fromParts = g.from.split('/').map(Number);
        const monthName = persianMonthNames[fromParts[1] - 1];
        
        // شماره هفته در ماه: هفته اول، دوم، سوم، چهارم، پنجم
        const weekOfMonth = Math.ceil(fromParts[2] / 7);
        const weekLabel = weekOfMonth === 1 ? 'اول' :
                          weekOfMonth === 2 ? 'دوم' :
                          weekOfMonth === 3 ? 'سوم' :
                          weekOfMonth === 4 ? 'چهارم' : 'پنجم';
        
        g.weekLabel = `📌 هفته ${weekLabel} ${monthName}`;
      }
    });
    
    return sorted;
  })();
  
  // ═══ گروه‌بندی ماهانه (جاری تا اسفند) ═══
  const monthGroups = (() => {
    const groups = {};
    const today = new Date();
    const todayJ = jalaali.toJalaali(today.getFullYear(), today.getMonth() + 1, today.getDate());
    
    dueTransactions.forEach(d => {
      if (!d.due_date_shamsi) return;
      if (d.due_date_shamsi < todayShamsi) return;
      const parts = d.due_date_shamsi.split('/');
      const jy = parseInt(parts[0]);
      const jm = parseInt(parts[1]);
      const monthKey = `${jy}/${String(jm).padStart(2, '0')}`;
      
      if (!groups[monthKey]) {
        groups[monthKey] = {
          key: monthKey,
          year: jy,
          month: jm,
          monthDiff: (jy - todayJ.jy) * 12 + (jm - todayJ.jm),
          transactions: [],
          debtorTotal: 0,
          creditorTotal: 0,
        };
      }
      
      groups[monthKey].transactions.push(d);
      
      if (d.debt_type === 'debtor') {
        groups[monthKey].debtorTotal += Number(d.amount);
      } else {
        groups[monthKey].creditorTotal += Number(d.amount);
      }
    });
    
    // همیشه از ماه جاری به اسفند
    const sorted = Object.values(groups).sort((a, b) => 
      (a.year * 12 + a.month) - (b.year * 12 + b.month)
    );
    
    sorted.forEach((g, idx) => {
      if (idx === 0) {
        g.monthLabel = '📌 ماه جاری';
      } else {
        g.monthLabel = `📌 ${persianMonthNames[g.month - 1]} ${g.year}`;
      }
    });
    
    return sorted;
  })();
  
  // ═══ پیشنهادات جستجو ═══
  const dueSuggestions = dueSearch.length >= 2
    ? debts
        .filter(d => 
          d.person_name?.toLowerCase().includes(dueSearch.toLowerCase()) ||
          d.person_phone?.includes(dueSearch)
        )
        .reduce((acc, d) => {
          if (!acc.find(p => p.person_name === d.person_name)) {
            acc.push({ person_name: d.person_name, person_phone: d.person_phone });
          }
          return acc;
        }, [])
        .slice(0, 6)
    : [];
  
  const shopName = selectedShop === 'all'   
    ? 'همه فروشگاه‌ها' 
    : shops.find(s => String(s.id) === String(selectedShop))?.name || '';
  
  return (
    <div className="min-h-screen bg-[#fdf2f8] pb-8">
      {/* هدر */}
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-3 py-3 flex items-center gap-2">
          <Link to="/seller/analytics" className="text-xs text-gray-500 hover:text-pink-600">← داشبورد</Link>
          <h1 className="text-lg font-extrabold text-gray-800 flex-1">
            📋 بدهکاران/بستانکاران
            <span className="text-[10px] text-gray-400 mr-2">({shopName})</span>
          </h1>
          <button onClick={() => { setShowForm(!showForm); setEditingId(null); resetForm(); }} className="bg-fuchsia-500 hover:bg-fuchsia-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1">
            <Plus size={14} /> افزودن
          </button>
        </div>
      </header>
      
      <main className="max-w-3xl mx-auto px-3 py-4">
        {/* خلاصه */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-white rounded-xl p-3 border shadow-sm text-center">
            <p className="text-xs font-bold text-red-600 mb-1">🔴 بدهکار</p>
            <p className="text-sm font-extrabold text-red-600 mb-1">{Number(summary.debtor_remaining || 0).toLocaleString('fa-IR')}</p>
            <p className="text-[9px] text-gray-400">بدهکار به من</p>
          </div>
          <div className="bg-white rounded-xl p-3 border shadow-sm text-center">
            <p className="text-xs font-bold text-blue-600 mb-1">🔵 بستانکار</p>
            <p className="text-sm font-extrabold text-blue-600 mb-1">{Number(summary.creditor_remaining || 0).toLocaleString('fa-IR')}</p>
            <p className="text-[9px] text-gray-400">طلبکار از من</p>
          </div>
          <div className="bg-white rounded-xl p-3 border shadow-sm text-center">
            <p className={`text-xs font-bold mb-1 ${(summary.balance || 0) >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
              📊 تراز
            </p>
            <p className={`text-sm font-extrabold mb-1 ${(summary.balance || 0) >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
              {Number(Math.abs(summary.balance || 0)).toLocaleString('fa-IR')} تومان
            </p>
            <p className="text-[9px] text-gray-400">
              {(summary.balance || 0) >= 0 ? 'بدهکار' : 'بستانکار'}
            </p>
          </div>
        </div>
        
        {/* فیلترها */}
        <div className="bg-white rounded-xl border shadow-sm mb-4 p-3">
          <div className="flex gap-1 mb-3 overflow-x-auto">
            {[
              { id: 'date', label: '📅 تاریخ' },
              { id: 'persons', label: '👥 اشخاص' },
              { id: 'due', label: '⏰ زمان سررسید' },
            ].map(t => (
              <button key={t.id} onClick={() => setFilterTab(t.id)}
                className={`text-[11px] px-3 py-1.5 rounded-lg whitespace-nowrap ${filterTab === t.id ? 'bg-fuchsia-500 text-white font-bold' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
                {t.label}
              </button>
            ))}
          </div>
          
          {/* فیلتر تاریخ */}
          {filterTab === 'date' && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <button onClick={() => openPicker('filter_from')} className={`text-[10px] px-2 py-1 rounded-md flex items-center gap-1 ${dateFrom ? 'bg-fuchsia-500 text-white' : 'bg-white border'}`}>
                {dateFrom || 'از تاریخ'}
              </button>
              <button onClick={() => openPicker('filter_to')} className={`text-[10px] px-2 py-1 rounded-md flex items-center gap-1 ${dateTo ? 'bg-fuchsia-500 text-white' : 'bg-white border'}`}>
                {dateTo || 'تا تاریخ'}
              </button>
              {(dateFrom || dateTo) && (
                <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-[10px] text-red-500">✕</button>
              )}
            </div>
          )}
          
          {/* فیلتر اشخاص */}
          {filterTab === 'persons' && (
            <div>
              <div className="relative mb-2">
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
                <input 
                  value={searchPerson} 
                  onChange={e => {
                    setSearchPerson(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="جستجو: نام، موبایل، کد ملی..." 
                  className="w-full pr-9 pl-3 py-2 border rounded-lg text-xs" 
                />
                
                {/* ═══ لیست پیشنهادات ═══ */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full right-0 left-0 mt-1 bg-white rounded-xl border shadow-lg z-20 max-h-60 overflow-y-auto">
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSearchPerson(s.person_name);
                          setShowSuggestions(false);
                        }}
                        className="w-full flex items-center justify-between p-2 hover:bg-fuchsia-50 border-b last:border-0 text-right"
                      >
                        <div className="flex-1">
                          <p className="text-xs font-bold text-gray-700">
                            👤 {s.person_name}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            📱 {s.person_phone}
                          </p>
                        </div>
                        <div className="text-left">
                          <p className={`text-xs font-extrabold ${s.balance >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                            {Number(Math.abs(s.balance)).toLocaleString('fa-IR')}
                          </p>
                          <p className="text-[9px] text-gray-400">
                            {s.balance >= 0 ? 'بدهکار' : 'بستانکار'}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                
                {/* پیام «چیزی پیدا نشد» */}
                {showSuggestions && searchPerson.length >= 2 && suggestions.length === 0 && (
                  <div className="absolute top-full right-0 left-0 mt-1 bg-white rounded-xl border shadow-lg z-20 p-3 text-center">
                    <p className="text-xs text-gray-400">چیزی پیدا نشد</p>
                  </div>
                )}
              </div>
              <div className="flex gap-1 mb-2">
                {[
                  { id: 'all', label: 'همه' },
                  { id: 'debtor', label: '🔴 بدهکار' },
                  { id: 'creditor', label: '🔵 بستانکار' },
                ].map(t => (
                  <button key={t.id} onClick={() => setFilterType(t.id)}
                    className={`text-[10px] px-2 py-1 rounded-md ${filterType === t.id ? 'bg-fuchsia-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* ═══════════════════════════════════════════════
              تب زمان سررسید
          ═══════════════════════════════════════════════ */}
          {filterTab === 'due' && (
            <div>
              {/* جستجوی هوشمند */}
              <div className="relative mb-3">
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
                <input 
                  value={dueSearch} 
                  onChange={e => {
                    setDueSearch(e.target.value);
                    setShowDueSuggestions(true);
                  }}
                  onFocus={() => setShowDueSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowDueSuggestions(false), 200)}
                  placeholder="جستجو: نام، موبایل، کد ملی..." 
                  className="w-full pr-9 pl-3 py-2 border rounded-lg text-xs" 
                />
                
                {showDueSuggestions && dueSuggestions.length > 0 && (
                  <div className="absolute top-full right-0 left-0 mt-1 bg-white rounded-xl border shadow-lg z-20 max-h-60 overflow-y-auto">
                    {dueSuggestions.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setDueSearch(s.person_name);
                          setShowDueSuggestions(false);
                        }}
                        className="w-full flex items-center p-2 hover:bg-fuchsia-50 border-b last:border-0 text-right"
                      >
                        <div className="flex-1">
                          <p className="text-xs font-bold text-gray-700">👤 {s.person_name}</p>
                          <p className="text-[10px] text-gray-400">📱 {s.person_phone}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* فیلتر نوع + سوییچ هفته/ماه */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex gap-1">
                  {[
                    { id: 'all', label: 'همه' },
                    { id: 'debtor', label: '🔴 بدهکاران' },
                    { id: 'creditor', label: '🔵 بستانکاران' },
                  ].map(t => (
                    <button key={t.id} onClick={() => setDueFilterType(t.id)}
                      className={`text-[10px] px-3 py-1.5 rounded-lg transition-all ${dueFilterType === t.id ? 'bg-fuchsia-500 text-white font-bold shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
                
                <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                  <button onClick={() => setDueView('week')}
                    className={`text-[10px] px-3 py-1 rounded-md transition-all ${dueView === 'week' ? 'bg-white text-fuchsia-600 font-bold shadow-sm' : 'text-gray-500'}`}>
                    📅 هفته
                  </button>
                  <button onClick={() => setDueView('month')}
                    className={`text-[10px] px-3 py-1 rounded-md transition-all ${dueView === 'month' ? 'bg-white text-fuchsia-600 font-bold shadow-sm' : 'text-gray-500'}`}>
                    📆 ماه
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* فرم — به صورت مودال */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3" onClick={() => { 
            setShowForm(false); 
            setEditingId(null); 
            resetForm(); 
            if (returnToPerson) {
              setTimeout(() => {
                openPerson(returnToPerson.person_name);
                setReturnToPerson(null);
              }, 100);
            }
          }}>
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border shadow-sm w-full max-w-md max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            
            {/* هدر فریز شده */}
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white rounded-t-2xl z-10">
              <h3 className="font-bold text-sm">{editingId ? 'ویرایش' : 'افزودن'} بدهکار/بستانکار</h3>
              <button type="button" onClick={() => { 
                setShowForm(false); 
                setEditingId(null); 
                resetForm(); 
                if (returnToPerson) {
                  setTimeout(() => {
                    openPerson(returnToPerson.person_name);
                    setReturnToPerson(null);
                  }, 100);
                }
              }} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            
            {/* بدنه فرم — اسکرول‌شونده */}
            <div className="p-4 overflow-y-auto flex-1">
            
            {/* نوع */}
            <div className="flex gap-2 mb-3">
              <button type="button" onClick={() => setDebtType('debtor')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold ${debtType === 'debtor' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                🔴 بدهکار
              </button>
              <button type="button" onClick={() => setDebtType('creditor')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold ${debtType === 'creditor' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                🔵 بستانکار
              </button>
            </div>
            
            {/* اطلاعات شخص */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="text-[9px] text-gray-400 mb-0.5 block">👤 نام <span className="text-red-500">*</span></label>
                <input value={personName} onChange={e => setPersonName(e.target.value)} placeholder="نام" className="px-3 py-2 border rounded-lg text-xs w-full" maxLength={100} />
              </div>
              <div>
                <label className="text-[9px] text-gray-400 mb-0.5 block">📱 موبایل <span className="text-red-500">*</span></label>
                <input 
                  value={personPhone} 
                  onChange={e => {
                    let val = e.target.value.replace(/[^0-9]/g, '');
                    if (val.length > 11) val = val.slice(0, 11);
                    setPersonPhone(val);
                    if (errors.phone) setErrors({...errors, phone: validatePhone(val)});
                  }}
                  onBlur={() => setErrors({...errors, phone: validatePhone(personPhone)})}
                  placeholder="09123456789" 
                  className={`px-3 py-2 border rounded-lg text-xs w-full ${
                    errors.phone ? 'border-red-400 bg-red-50' : 
                    personPhone && !errors.phone ? 'border-green-400 bg-green-50' : ''
                  }`}
                  maxLength={11}
                  inputMode="numeric"
                />
                {errors.phone && <p className="text-[9px] text-red-500 mt-0.5">⚠️ {errors.phone}</p>}
              </div>
              
              <div>
                <label className="text-[9px] text-gray-400 mb-0.5 block">🆔 کد ملی</label>
                <input 
                  value={personNationalId} 
                  onChange={e => {
                    let val = e.target.value.replace(/[^0-9]/g, '');
                    if (val.length > 10) val = val.slice(0, 10);
                    setPersonNationalId(val);
                    if (errors.nationalId) setErrors({...errors, nationalId: validateNationalId(val)});
                    if (val.length === 10 && validateNationalId(val) === '') {
                      lookupPersonByNid(val);
                    }
                  }}
                  onBlur={() => setErrors({...errors, nationalId: validateNationalId(personNationalId)})}
                  placeholder="۱۰ رقم" 
                  className={`px-3 py-2 border rounded-lg text-xs w-full ${
                    errors.nationalId ? 'border-red-400 bg-red-50' : 
                    personNationalId && !errors.nationalId ? 'border-green-400 bg-green-50' : ''
                  }`}
                  maxLength={10}
                  inputMode="numeric"
                />
                {errors.nationalId && <p className="text-[9px] text-red-500 mt-0.5">⚠️ {errors.nationalId}</p>}
              </div>
              
              <div>
                <label className="text-[9px] text-gray-400 mb-0.5 block">📮 کد پستی</label>
                <input 
                  value={personPostalCode} 
                  onChange={e => {
                    let val = e.target.value.replace(/[^0-9]/g, '');
                    if (val.length > 10) val = val.slice(0, 10);
                    setPersonPostalCode(val);
                    if (errors.postalCode) setErrors({...errors, postalCode: validatePostalCode(val)});
                  }}
                  onBlur={() => setErrors({...errors, postalCode: validatePostalCode(personPostalCode)})}
                  placeholder="۱۰ رقم" 
                  className={`px-3 py-2 border rounded-lg text-xs w-full ${
                    errors.postalCode ? 'border-red-400 bg-red-50' : 
                    personPostalCode && !errors.postalCode ? 'border-green-400 bg-green-50' : ''
                  }`}
                  maxLength={10}
                  inputMode="numeric"
                />
                {errors.postalCode && <p className="text-[9px] text-red-500 mt-0.5">⚠️ {errors.postalCode}</p>}
              </div>
            </div>
            <div className="mb-3">
              <label className="text-[9px] text-gray-400 mb-0.5 block">🏠 آدرس</label>
              <input value={personAddress} onChange={e => setPersonAddress(e.target.value)} placeholder="آدرس" className="w-full px-3 py-2 border rounded-lg text-xs" />
            </div>
            
            {/* شماره کارت و شبا و بانک — فقط برای بستانکار */}
            {debtType === 'creditor' && (
              <>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                <label className="text-[9px] text-gray-400 mb-0.5 block">💳 شماره کارت</label>
                <input 
                  value={cardNumber} 
                  onChange={e => {
                    let val = e.target.value.replace(/[^0-9]/g, '');
                    if (val.length > 16) val = val.slice(0, 16);
                    setCardNumber(val);
                    
                    // تشخیص خودکار بانک
                    if (val.length >= 6) {
                      const detected = detectBankFromCard(val);
                      setBankName(detected || '');
                    } else {
                      setBankName('');
                    }
                    
                    // پاک کردن خطا موقع تایپ
                    if (errors.cardNumber) setErrors({...errors, cardNumber: ''});
                  }}
                  onBlur={() => {
                    // فقط بعد از پر شدن کامل، اعتبارسنجی
                    if (cardNumber.length === 16) {
                      setErrors({...errors, cardNumber: validateCardNumber(cardNumber)});
                    } else if (cardNumber.length > 0) {
                      setErrors({...errors, cardNumber: 'شماره کارت باید ۱۶ رقم باشد'});
                    }
                  }}
                  placeholder="شماره کارت (۱۶ رقم)" 
                  className={`px-3 py-2 border rounded-lg text-xs ${
                    errors.cardNumber ? 'border-red-400 bg-red-50' : 
                    cardNumber.length === 16 && !errors.cardNumber ? 'border-green-400 bg-green-50' : ''
                  }`}
                  maxLength={16}
                  inputMode="numeric"
                />
                {errors.cardNumber && <p className="text-[9px] text-red-500 mt-0.5">⚠️ {errors.cardNumber}</p>}
                </div>
                <div>
                <label className="text-[9px] text-gray-400 mb-0.5 block">🔢 شماره شبا</label>
                <input 
                  value={shebaNumber} 
                  onChange={e => {
                    let val = e.target.value.replace(/[^0-9]/g, '');
                    if (val.length > 24) val = val.slice(0, 24);
                    setShebaNumber(val);
                    
                    // تشخیص خودکار بانک
                    if (val.length >= 3) {
                      const detected = detectBankFromSheba(val);
                      setBankName(detected || '');
                    } else {
                      setBankName('');
                    }
                    
                    // پاک کردن خطا موقع تایپ
                    if (errors.sheba) setErrors({...errors, sheba: ''});
                  }}
                  onBlur={() => {
                    // فقط بعد از پر شدن کامل، اعتبارسنجی
                    if (shebaNumber.length === 24) {
                      setErrors({...errors, sheba: validateSheba(shebaNumber)});
                    } else if (shebaNumber.length > 0) {
                      setErrors({...errors, sheba: 'شبا باید ۲۴ رقم باشد (بدون IR)'});
                    }
                  }}
                  placeholder="شبا (۲۴ رقم بدون IR)" 
                  className={`w-full px-3 py-2 border rounded-lg text-xs ${
                    errors.sheba ? 'border-red-400 bg-red-50' : 
                    shebaNumber.length === 24 && !errors.sheba ? 'border-green-400 bg-green-50' : ''
                  }`}
                  maxLength={24}
                  inputMode="numeric"
                />
                {errors.sheba && <p className="text-[9px] text-red-500 mt-0.5">⚠️ {errors.sheba}</p>}
                </div>
              </div>
              <input 
                value={bankName} 
                readOnly
                placeholder="🏦 نام بانک (خودکار)"
                className="w-full px-3 py-2 border rounded-lg text-xs mb-2 bg-gray-50 text-gray-600 cursor-not-allowed"
                maxLength={50}
              />
              {debtType === 'debtor' && (
                <p className="text-[9px] text-gray-400 mb-2">ℹ️ این فیلدها برای بدهکار اختیاری‌ست</p>
              )}
              </>
            )}
            
            {/* مبلغ */}
            <div className="mb-3">
              <div className="relative">
                <input value={amountDisplay} onChange={handleAmountChange} placeholder="💰 مبلغ (تومان) *" className="w-full px-3 py-2 border rounded-lg text-xs" />
              </div>
            </div>
            
            {/* تاریخ‌ها */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button type="button" onClick={() => openPicker('transaction')} className="px-3 py-2 border rounded-lg text-xs text-right">
                📅 {transactionDate || 'تاریخ تراکنش'}
              </button>
              <div className="flex gap-1">
                <button type="button" onClick={() => openPicker('due')} className="flex-1 px-3 py-2 border rounded-lg text-xs text-right">
                  ⏰ {dueDate || 'سررسید (اختیاری)'}
                </button>
                {dueDate && (
                  <button type="button" onClick={() => setDueDate('')} className="px-2 py-2 border rounded-lg text-xs text-red-500 hover:bg-red-50">
                    ✕
                  </button>
                )}
              </div>
            </div>
            
            {/* شرح */}
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="شرح (اختیاری)" rows={2} className="w-full px-3 py-2 border rounded-lg text-xs mb-3 resize-none" />
            
            </div>
            
            {/* دکمه‌های فریز شده */}
            <div className="flex gap-2 p-4 border-t bg-white rounded-b-2xl sticky bottom-0 z-10">
              <button type="submit" className="bg-fuchsia-500 text-white px-4 py-2 rounded-lg text-xs font-bold flex-1">{editingId ? 'ذخیره' : 'ثبت'}</button>
              <button type="button" onClick={() => { 
                setShowForm(false); 
                setEditingId(null); 
                resetForm(); 
                if (returnToPerson) {
                  setTimeout(() => {
                    openPerson(returnToPerson.person_name);
                    setReturnToPerson(null);
                  }, 100);
                }
              }} className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-xs font-bold">انصراف</button>
            </div>
          </form>
          </div>
        )}
        
        {/* لیست */}
        {loading ? (
          <div className="text-center py-8 text-gray-400 text-xs">در حال بارگذاری...</div>
        ) : debts.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-xs">موردی یافت نشد</div>
        ) : filterTab === 'due' ? (
          // ═══ نمای زمان سررسید ═══
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 items-start">
            {/* سررسید گذشته */}
            {(() => {
              const today = new Date();
              const j = jalaali.toJalaali(today.getFullYear(), today.getMonth() + 1, today.getDate());
              const todayStr = `${j.jy}/${String(j.jm).padStart(2, '0')}/${String(j.jd).padStart(2, '0')}`;
              
              const overdue = dueTransactions.filter(d => d.due_date_shamsi < todayStr);
              
              if (overdue.length === 0) return null;
              
              return (
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl border-2 border-red-200 shadow-md overflow-hidden">
                  <div className="bg-gradient-to-l from-red-500 to-red-600 p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl animate-pulse">🔴</span>
                      <h3 className="font-bold text-white text-sm">سررسید گذشته</h3>
                    </div>
                    <span className="text-[11px] bg-white/20 text-white px-2 py-1 rounded-lg font-bold">
                      {overdue.length} تراکنش
                    </span>
                  </div>
                  <div className="p-3 space-y-2">
                    {overdue.map((d, i) => (
                      <button
                        key={i}
                        onClick={() => handleEdit(d)}
                        className="w-full bg-white rounded-xl p-2.5 hover:shadow-md transition-all text-right border border-red-100"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-bold ${d.debt_type === 'debtor' ? 'text-red-600' : 'text-blue-600'}`}>
                            {d.debt_type === 'debtor' ? '🔴' : '🔵'} {d.person_name}
                            <span className="text-[10px] text-gray-400 mr-2">{d.person_phone}</span>
                          </span>
                          <span className={`text-xs font-extrabold ${d.debt_type === 'debtor' ? 'text-red-600' : 'text-blue-600'}`}>
                            {Number(d.amount).toLocaleString('fa-IR')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-red-500 animate-pulse font-bold">
                            ⏰ {d.due_date_shamsi}
                          </span>
                          {d.notes && <span className="text-gray-400 truncate">📝 {d.notes}</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="bg-red-50 border-t border-red-200 p-2 flex items-center justify-between text-[11px]">
                    <span className="text-red-700 font-bold">جمع:</span>
                    <div className="flex gap-3">
                      <span className="text-red-600 font-extrabold">
                        🔴 {Number(overdue.filter(d => d.debt_type === 'debtor').reduce((s, d) => s + Number(d.amount), 0)).toLocaleString('fa-IR')}
                      </span>
                      {overdue.filter(d => d.debt_type === 'creditor').length > 0 && (
                        <span className="text-blue-600 font-extrabold">
                          🔵 {Number(overdue.filter(d => d.debt_type === 'creditor').reduce((s, d) => s + Number(d.amount), 0)).toLocaleString('fa-IR')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
            
            {/* گروه بدون سررسید */}
            {noDueTransactions.length > 0 && (
              <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                <div className="bg-gradient-to-l from-gray-500 to-gray-600 p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📋</span>
                    <h3 className="font-bold text-white text-xs">بدون سررسید</h3>
                  </div>
                  <span className="text-[10px] bg-white/20 text-white px-2 py-1 rounded-lg font-bold">
                    {noDueTransactions.length} تراکنش
                  </span>
                </div>
                <div className="p-3 space-y-2">
                  {noDueTransactions.map((d, i) => (
                    <button
                      key={i}
                      onClick={() => handleEdit(d)}
                      className="w-full bg-gray-50 hover:bg-gray-100 rounded-xl p-2.5 transition-all text-right"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-bold ${d.debt_type === 'debtor' ? 'text-red-600' : 'text-blue-600'}`}>
                          {d.debt_type === 'debtor' ? '🔴' : '🔵'} {d.person_name}
                          <span className="text-[10px] text-gray-400 mr-2">{d.person_phone}</span>
                        </span>
                        <span className={`text-xs font-extrabold ${d.debt_type === 'debtor' ? 'text-red-600' : 'text-blue-600'}`}>
                          {Number(d.amount).toLocaleString('fa-IR')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-gray-500">📅 {d.transaction_date_shamsi || d.transaction_date}</span>
                        {d.notes && <span className="text-gray-400 truncate">📝 {d.notes}</span>}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="bg-gray-50 border-t p-2 flex items-center justify-between text-[11px]">
                  <span className="text-gray-700 font-bold">جمع:</span>
                  <div className="flex gap-3">
                    {noDueTransactions.filter(d => d.debt_type === 'debtor').length > 0 && (
                      <span className="text-red-600 font-extrabold">
                        🔴 {Number(noDueTransactions.filter(d => d.debt_type === 'debtor').reduce((s, d) => s + Number(d.amount), 0)).toLocaleString('fa-IR')}
                      </span>
                    )}
                    {noDueTransactions.filter(d => d.debt_type === 'creditor').length > 0 && (
                      <span className="text-blue-600 font-extrabold">
                        🔵 {Number(noDueTransactions.filter(d => d.debt_type === 'creditor').reduce((s, d) => s + Number(d.amount), 0)).toLocaleString('fa-IR')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* گروه‌بندی هفته/ماه */}
            {dueView === 'week' ? (
              weekGroups.map((group, gi) => {
                // روزهای هفته (شنبه تا جمعه)
                const startDate = group.from.split('/').map(Number);
                const weekDays = [];
                for (let i = 0; i < 7; i++) {
                  let d = startDate[2] + i;
                  let m = startDate[1];
                  let y = startDate[0];
                  // اگه از ۳۱ رد شد (تقریبی)
                  if (d > 31) { d -= 31; m += 1; }
                  if (m > 12) { m -= 12; y += 1; }
                  weekDays.push({ day: d, month: m, year: y, dateStr: `${y}/${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}` });
                }
                
                // تراکنش‌های هر روز
                const txByDay = {};
                group.transactions.forEach(t => {
                  if (!txByDay[t.due_date_shamsi]) txByDay[t.due_date_shamsi] = [];
                  txByDay[t.due_date_shamsi].push(t);
                });
                
                return (
                <div key={gi} className="bg-white rounded-2xl border border-fuchsia-100 shadow-sm overflow-hidden">
                  {/* هدر */}
                  <div className="bg-gradient-to-l from-fuchsia-500 to-fuchsia-600 px-3 py-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">📅</span>
                        <h3 className="font-bold text-white text-[11px]">
                          {group.weekLabel}
                        </h3>

                      </div>
                      <span className="text-[9px] bg-white/20 text-white px-1.5 py-0.5 rounded-md font-bold">
                        {group.transactions.length}
                      </span>
                    </div>
                    {/* تقویم جمع و جور */}
                    <div className="grid grid-cols-7 gap-0.5 text-center">
                      {['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'].map((d, i) => (
                        <div key={i} className="text-[8px] text-white/60 font-bold">{d}</div>
                      ))}
                      {weekDays.map((wd, i) => {
                        const hasTx = txByDay[wd.dateStr]?.length > 0;
                        return (
                          <div key={i} className={`relative text-[9px] py-0.5 rounded ${
                            hasTx ? 'bg-white text-fuchsia-700 font-bold shadow-sm' : 'text-white/70'
                          }`}>
                            {wd.day}
                            {hasTx && (
                              <span className="absolute top-0 right-0 w-1 h-1 bg-red-500 rounded-full"></span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* لیست تراکنش‌ها */}
                  <div className="divide-y divide-gray-50">
                    {group.transactions.map((d, i) => (
                      <button
                        key={i}
                        onClick={() => handleEdit(d)}
                        className="w-full hover:bg-fuchsia-50/50 px-2 py-1.5 transition-all text-right"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[10px] font-bold truncate ${d.debt_type === 'debtor' ? 'text-red-600' : 'text-blue-600'}`}>
                            {d.debt_type === 'debtor' ? '🔴' : '🔵'} {d.person_name}
                          </span>
                          <span className={`text-[10px] font-extrabold whitespace-nowrap ${d.debt_type === 'debtor' ? 'text-red-600' : 'text-blue-600'}`}>
                            {Number(d.amount).toLocaleString('fa-IR')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[9px] text-gray-400 mt-0.5">
                          <span>⏰ {d.due_date_shamsi}</span>
                          {d.notes && <span className="truncate max-w-[120px]">📝 {d.notes}</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                  
                  {/* جمع */}
                  <div className="bg-fuchsia-50/50 border-t border-fuchsia-100 px-2 py-1.5 flex items-center justify-between text-[10px]">
                    <span className="text-fuchsia-700 font-bold">جمع:</span>
                    <div className="flex gap-2">
                      {group.debtorTotal > 0 && (
                        <span className="text-red-600 font-extrabold">
                          🔴 {Number(group.debtorTotal).toLocaleString('fa-IR')}
                        </span>
                      )}
                      {group.creditorTotal > 0 && (
                        <span className="text-blue-600 font-extrabold">
                          🔵 {Number(group.creditorTotal).toLocaleString('fa-IR')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                );
              })
            ) : (
              monthGroups.map((group, gi) => (
                <div key={gi} className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
                  {/* هدر */}
                  <div className="bg-gradient-to-l from-indigo-500 to-indigo-600 px-3 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">📆</span>
                      <h3 className="font-bold text-white text-[11px]">
                        {group.monthLabel}
                      </h3>
                    </div>
                    <span className="text-[9px] bg-white/20 text-white px-1.5 py-0.5 rounded-md font-bold">
                      {group.transactions.length}
                    </span>
                  </div>
                  
                  {/* لیست تراکنش‌ها */}
                  <div className="divide-y divide-gray-50">
                    {group.transactions.map((d, i) => (
                      <button
                        key={i}
                        onClick={() => handleEdit(d)}
                        className="w-full hover:bg-indigo-50/50 px-2 py-1.5 transition-all text-right"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[10px] font-bold truncate ${d.debt_type === 'debtor' ? 'text-red-600' : 'text-blue-600'}`}>
                            {d.debt_type === 'debtor' ? '🔴' : '🔵'} {d.person_name}
                          </span>
                          <span className={`text-[10px] font-extrabold whitespace-nowrap ${d.debt_type === 'debtor' ? 'text-red-600' : 'text-blue-600'}`}>
                            {Number(d.amount).toLocaleString('fa-IR')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[9px] text-gray-400 mt-0.5">
                          <span>⏰ {d.due_date_shamsi}</span>
                          {d.notes && <span className="truncate max-w-[120px]">📝 {d.notes}</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                  
                  {/* جمع */}
                  <div className="bg-indigo-50/50 border-t border-indigo-100 px-2 py-1.5 flex items-center justify-between text-[10px]">
                    <span className="text-indigo-700 font-bold">جمع:</span>
                    <div className="flex gap-2">
                      {group.debtorTotal > 0 && (
                        <span className="text-red-600 font-extrabold">
                          🔴 {Number(group.debtorTotal).toLocaleString('fa-IR')}
                        </span>
                      )}
                      {group.creditorTotal > 0 && (
                        <span className="text-blue-600 font-extrabold">
                          🔵 {Number(group.creditorTotal).toLocaleString('fa-IR')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {dueTransactions.length === 0 && noDueTransactions.length === 0 && (
              <div className="text-center py-10 text-gray-400 text-xs bg-white rounded-2xl border">
                <span className="text-3xl block mb-2">📭</span>
                تراکنشی یافت نشد
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {Object.values(debts.reduce((acc, d) => {
              const key = d.person_name;
              if (!acc[key]) {
                acc[key] = { name: key, phone: d.person_phone, items: [], debtor: 0, creditor: 0, earliestDue: null };
              }
              acc[key].items.push(d);
              if (d.debt_type === 'debtor') acc[key].debtor += Number(d.amount);
              else acc[key].creditor += Number(d.amount);
              
              // نزدیک‌ترین سررسید
              if (d.due_date_shamsi) {
                const dueNum = parseInt(d.due_date_shamsi.replace(/\//g, ''));
                if (!acc[key].earliestDue || dueNum < parseInt(acc[key].earliestDue.replace(/\//g, ''))) {
                  acc[key].earliestDue = d.due_date_shamsi;
                }
              }
              return acc;
            }, {}))
            .sort((a, b) => {
              // مرتب‌سازی بر اساس سررسید
              if (a.earliestDue && !b.earliestDue) return -1;
              if (!a.earliestDue && b.earliestDue) return 1;
              if (a.earliestDue && b.earliestDue) {
                return parseInt(a.earliestDue.replace(/\//g, '')) - parseInt(b.earliestDue.replace(/\//g, ''));
              }
              // اگه هیچ‌کدوم سررسید نداشتن، بر اساس نام
              return a.name.localeCompare(b.name, 'fa');
            })
            .map((person, idx) => {
              const balance = person.debtor - person.creditor;
              return (
                <div key={idx} className="bg-white rounded-xl border shadow-sm p-3">
                  <div className="flex items-center justify-between">
                    <button onClick={() => openPerson(person.name)} className="text-right hover:underline flex-1">
                      <span className="text-xs font-bold text-gray-700">
                        👤 {person.name}
                        <span className="text-[10px] text-gray-400 mr-2">{person.phone}</span>
                      </span>

                    </button>
                    <div className="text-left">
                      <span className={`text-xs font-extrabold ${balance >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                        {Number(Math.abs(balance)).toLocaleString('fa-IR')}
                      </span>
                      <span className="text-[9px] text-gray-400 mr-1">{balance >= 0 ? 'بدهکار' : 'بستانکار'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      
      {/* مودال شخص */}
      {selectedPerson && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3" onClick={() => setSelectedPerson(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            
            {/* هدر: نام + موبایل — رنگ بر اساس مانده کل */}
            {(() => {
              const debtorTotal = personDebts.filter(d => d.debt_type === 'debtor').reduce((s, d) => s + Number(d.amount), 0);
              const creditorTotal = personDebts.filter(d => d.debt_type === 'creditor').reduce((s, d) => s + Number(d.amount), 0);
              const balance = debtorTotal - creditorTotal;
              const isDebtor = balance >= 0;
              
              return (
                <div className={`flex items-center justify-between p-3 border-b ${
                  isDebtor 
                    ? 'bg-gradient-to-l from-red-500 to-red-600' 
                    : 'bg-gradient-to-l from-blue-500 to-blue-600'
                }`}>
                  <h2 className="font-bold text-white text-sm flex items-center gap-3 flex-1">
                    <span>
                      {isDebtor ? '🔴' : '🔵'} {selectedPerson.person_name}
                    </span>
                    <span className="text-[12px] bg-white/20 px-2 py-0.5 rounded-lg font-mono font-bold">
                      📱 {selectedPerson.person_phone}
                    </span>
                  </h2>
                  <button onClick={() => setSelectedPerson(null)} className="text-white"><X size={18} /></button>
                </div>
              );
            })()}
            
            {/* ردیف زیر هدر: نام فروشگاه (چپ) + دکمه رویداد جدید (راست) */}
            <div className="flex items-center justify-between p-2 bg-gray-50 border-b">
              <span className="text-[11px] text-gray-600">
                🏪 {shopName}
              </span>
              <button 
                onClick={() => startNewEventForPerson(selectedPerson)}
                className="text-[10px] bg-fuchsia-500 hover:bg-fuchsia-600 text-white px-3 py-1.5 rounded-lg font-bold"
              >
                ➕ رویداد جدید
              </button>
            </div>


            {/* جدول تراکنش‌ها */}
            <div className="overflow-auto max-h-[50vh]">
              <table className="w-full text-[10px]">
                <thead className="bg-gray-100 sticky top-0 z-10">
                  <tr>
                    <th className="p-2 text-center w-10">ردیف</th>
                    <th className="p-2 text-center">تاریخ ثبت</th>
                    <th className="p-2 text-center">مبلغ</th>
                    <th className="p-2 text-center">سررسید</th>
                    <th className="p-2 text-center">مانده</th>
                    <th className="p-2 text-center">
                      بد <span className="inline-block w-2 h-2 rounded-full bg-red-500 align-middle"></span> 
                      / بس <span className="inline-block w-2 h-2 rounded-full bg-blue-500 align-middle"></span>
                    </th>
                    <th className="p-2 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {personDebts.map((d, i) => {
                    const runningBalance = personDebts.slice(0, i + 1).reduce((s, x) => 
                      s + (x.debt_type === 'debtor' ? Number(x.amount) : -Number(x.amount)), 0
                    );
                    return (
                    <tr key={d.id} className="border-b hover:bg-gray-50">
                      <td className="p-2 text-center text-gray-500">{i + 1}</td>
                      <td className="p-2 text-center">{d.transaction_date_shamsi || d.transaction_date}</td>
                      <td className={`p-2 text-center font-bold ${d.debt_type === 'debtor' ? 'text-red-600' : 'text-blue-600'}`}>
                        {Number(d.amount).toLocaleString('fa-IR')}
                      </td>
                      <td className={`p-2 text-center ${d.is_overdue ? 'text-red-500 animate-pulse font-bold' : ''}`}>
                        {d.due_date_shamsi || '—'}
                      </td>
                      <td className={`p-2 text-center font-bold ${runningBalance >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                        {Number(Math.abs(runningBalance)).toLocaleString('fa-IR')}
                      </td>
                      <td className="p-2 text-center">
                        {d.debt_type === 'debtor' 
                          ? <span className="inline-block w-3 h-3 rounded-full bg-red-500"></span>
                          : <span className="inline-block w-3 h-3 rounded-full bg-blue-500"></span>}
                      </td>
                      <td className="p-2 text-center">
                        <div className="flex gap-1 justify-center">
                          <button onClick={() => { setSelectedPerson(null); handleEdit(d); }} className="text-blue-500 hover:bg-blue-50 p-1 rounded">
                            <Edit2 size={12} />
                          </button>
                          <button onClick={() => handleDelete(d.id)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-100 font-bold sticky bottom-0">
                  <tr>
                    <td colSpan="2" className="p-2 text-left">
                      مانده حساب {personDebts.length} ردیف:
                    </td>
                    <td colSpan="5" className="p-2 text-center">
                      {(() => {
                        const debtorTotal = personDebts.filter(d => d.debt_type === 'debtor').reduce((s, d) => s + Number(d.amount), 0);
                        const creditorTotal = personDebts.filter(d => d.debt_type === 'creditor').reduce((s, d) => s + Number(d.amount), 0);
                        const balance = debtorTotal - creditorTotal;
                        const isDebtor = balance >= 0;
                        return (
                          <span className={`${isDebtor ? 'text-red-600' : 'text-blue-600'}`}>
                            {isDebtor ? '🔴' : '🔵'} {Number(Math.abs(balance)).toLocaleString('fa-IR')}
                            <span className="text-[10px] mr-1">{isDebtor ? 'بدهکار' : 'بستانکار'}</span>
                          </span>
                        );
                      })()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>


          </div>
        </div>
      )}

      {/* مودال تقویم شمسی */}
      {showDatePicker && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-3" onClick={() => setShowDatePicker(false)}>
          <div className="bg-white rounded-2xl border border-fuchsia-100 shadow-xl p-3 w-72" onClick={e => e.stopPropagation()}>
            {/* هدر: سال و ماه */}
            <div className="flex items-center justify-between mb-3 bg-gradient-to-l from-fuchsia-500 to-fuchsia-600 rounded-xl p-2">
              <button type="button" onClick={() => { if (pickerMonth === 1) { setPickerMonth(12); setPickerYear(pickerYear - 1); } else setPickerMonth(pickerMonth - 1); }}
                className="w-7 h-7 text-white hover:bg-white/20 rounded-lg flex items-center justify-center text-lg">‹</button>
              <div className="flex gap-1">
                <select value={pickerMonth} onChange={e => setPickerMonth(Number(e.target.value))}
                  className="px-1.5 py-0.5 rounded-lg text-xs bg-white/90 font-bold text-fuchsia-700 cursor-pointer">
                  {persianMonthNames.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
                <select value={pickerYear} onChange={e => setPickerYear(Number(e.target.value))}
                  className="px-1.5 py-0.5 rounded-lg text-xs bg-white/90 font-bold text-fuchsia-700 cursor-pointer">
                  {[...Array(20)].map((_, i) => <option key={i} value={1400 + i}>{1400 + i}</option>)}
                </select>
              </div>
              <button type="button" onClick={() => { if (pickerMonth === 12) { setPickerMonth(1); setPickerYear(pickerYear + 1); } else setPickerMonth(pickerMonth + 1); }}
                className="w-7 h-7 text-white hover:bg-white/20 rounded-lg flex items-center justify-center text-lg">›</button>
            </div>

            {/* روزهای هفته */}
            <div className="grid grid-cols-7 gap-0.5 mb-1 text-center text-[10px] text-fuchsia-600 font-bold">
              <div>ش</div><div>ی</div><div>د</div><div>س</div><div>چ</div><div>پ</div><div>ج</div>
            </div>

            {/* روزها */}
            <div className="grid grid-cols-7 gap-0.5">
              {[...Array(getDaysInMonth(pickerYear, pickerMonth))].map((_, i) => {
                const day = i + 1;
                const dateStr = `${pickerYear}/${String(pickerMonth).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
                const isSelected = 
                  (pickerTarget === 'transaction' && transactionDate === dateStr) ||
                  (pickerTarget === 'due' && dueDate === dateStr) ||
                  (pickerTarget === 'filter_from' && dateFrom === dateStr) ||
                  (pickerTarget === 'filter_to' && dateTo === dateStr);
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
                      isSelected ? 'bg-fuchsia-600 text-white font-bold' : 
                      isToday ? 'bg-fuchsia-100 text-fuchsia-700 font-bold' : 
                      'hover:bg-fuchsia-50 text-gray-700'
                    }`}>
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
