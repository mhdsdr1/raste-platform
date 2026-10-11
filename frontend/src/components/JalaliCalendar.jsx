import { useState, useEffect } from 'react';
import * as jalaali from 'jalaali-js';

const persianMonthNames = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
const persianWeekDays = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

// توابع کمکی
export const getDaysInMonth = (jy, jm) => jalaali.jalaaliMonthLength(jy, jm);

export const getFirstDayOfWeek = (jy, jm) => {
  try {
    const g = jalaali.toGregorian(jy, jm, 1);
    const date = new Date(g.gy, g.gm - 1, g.gd);
    const jsDay = date.getDay();
    return (jsDay + 1) % 7;
  } catch (e) { return 0; }
};

export const todayShamsi = () => {
  try {
    const today = new Date();
    const j = jalaali.toJalaali(today.getFullYear(), today.getMonth() + 1, today.getDate());
    return `${j.jy}/${String(j.jm).padStart(2, '0')}/${String(j.jd).padStart(2, '0')}`;
  } catch (e) { return ''; }
};

export const persianToNumber = (persianDate) => {
  if (!persianDate) return 0;
  const parts = persianDate.split('/');
  if (parts.length !== 3) return 0;
  return parseInt(parts[0]) * 10000 + parseInt(parts[1]) * 100 + parseInt(parts[2]);
};

export const shamsiToGregorian = (shamsiDate) => {
  if (!shamsiDate) return '';
  try {
    const parts = shamsiDate.split('/').map(Number);
    const g = jalaali.toGregorian(parts[0], parts[1], parts[2]);
    return `${g.gy}-${String(g.gm).padStart(2, '0')}-${String(g.gd).padStart(2, '0')}`;
  } catch (e) { return ''; }
};

const THEMES = {
  pink: {
    header: 'from-pink-500 to-pink-600',
    accent: 'text-pink-600',
    accentBg: 'bg-pink-100',
    selected: 'bg-pink-600 text-white',
    hover: 'hover:bg-pink-50',
  },
  fuchsia: {
    header: 'from-fuchsia-500 to-fuchsia-600',
    accent: 'text-fuchsia-600',
    accentBg: 'bg-fuchsia-100',
    selected: 'bg-fuchsia-600 text-white',
    hover: 'hover:bg-fuchsia-50',
  },
  indigo: {
    header: 'from-indigo-500 to-indigo-600',
    accent: 'text-indigo-600',
    accentBg: 'bg-indigo-100',
    selected: 'bg-indigo-600 text-white',
    hover: 'hover:bg-indigo-50',
  },
};

export default function JalaliCalendar({ 
  value = '',
  onChange,
  onClose,
  theme = 'fuchsia',
  showToday = true,
  showClear = true,
  minYear = 1400,
  maxYear = 1420,
}) {
  const colors = THEMES[theme] || THEMES.fuchsia;
  
  const today = todayShamsi();
  const todayParts = today.split('/').map(Number);
  
  const [pickerYear, setPickerYear] = useState(todayParts[0] || 1405);
  const [pickerMonth, setPickerMonth] = useState(todayParts[1] || 1);
  
  useEffect(() => {
    if (value) {
      const parts = value.split('/').map(Number);
      if (parts.length === 3) {
        setPickerYear(parts[0]);
        setPickerMonth(parts[1]);
      }
    }
  }, [value]);
  
  const daysInMonth = getDaysInMonth(pickerYear, pickerMonth);
  const firstDayOfWeek = getFirstDayOfWeek(pickerYear, pickerMonth);
  
  const selectDay = (day) => {
    const dateStr = `${pickerYear}/${String(pickerMonth).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
    onChange?.(dateStr);
  };
  
  const goToday = () => onChange?.(today);
  
  const goPrevMonth = () => {
    if (pickerMonth === 1) { setPickerMonth(12); setPickerYear(pickerYear - 1); }
    else setPickerMonth(pickerMonth - 1);
  };
  
  const goNextMonth = () => {
    if (pickerMonth === 12) { setPickerMonth(1); setPickerYear(pickerYear + 1); }
    else setPickerMonth(pickerMonth + 1);
  };
  
  return (
    <div className="bg-white rounded-2xl border shadow-xl p-3 w-72" onClick={e => e.stopPropagation()}>
      <div className={`flex items-center justify-between mb-3 bg-gradient-to-l ${colors.header} rounded-xl p-2`}>
        <button type="button" onClick={goPrevMonth}
          className="w-7 h-7 text-white hover:bg-white/20 rounded-lg flex items-center justify-center text-lg">‹</button>
        <div className="flex gap-1">
          <select value={pickerMonth} onChange={e => setPickerMonth(Number(e.target.value))}
            className="px-1.5 py-0.5 rounded-lg text-xs bg-white/90 font-bold text-gray-700 cursor-pointer">
            {persianMonthNames.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={pickerYear} onChange={e => setPickerYear(Number(e.target.value))}
            className="px-1.5 py-0.5 rounded-lg text-xs bg-white/90 font-bold text-gray-700 cursor-pointer">
            {[...Array(maxYear - minYear + 1)].map((_, i) => {
              const y = minYear + i;
              return <option key={y} value={y}>{y}</option>;
            })}
          </select>
        </div>
        <button type="button" onClick={goNextMonth}
          className="w-7 h-7 text-white hover:bg-white/20 rounded-lg flex items-center justify-center text-lg">›</button>
      </div>

      <div className={`grid grid-cols-7 gap-0.5 mb-1 text-center text-[10px] font-bold ${colors.accent}`}>
        {persianWeekDays.map((d, i) => <div key={i}>{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {[...Array(firstDayOfWeek)].map((_, i) => (
          <div key={`empty-${i}`}></div>
        ))}
        {[...Array(daysInMonth)].map((_, i) => {
          const day = i + 1;
          const dateStr = `${pickerYear}/${String(pickerMonth).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
          const isSelected = value === dateStr;
          const isToday = today === dateStr;
          
          return (
            <button 
              key={i} 
              type="button" 
              onClick={() => selectDay(day)}
              className={`w-7 h-7 rounded-lg text-xs flex items-center justify-center transition-all ${
                isSelected ? `${colors.selected} font-bold` : 
                isToday ? `${colors.accentBg} ${colors.accent} font-bold` : 
                `${colors.hover} text-gray-700`
              }`}>
              {day}
            </button>
          );
        })}
      </div>
      
      {(showToday || showClear) && (
        <div className="flex gap-1 mt-3 pt-2 border-t">
          {showToday && (
            <button 
              type="button" 
              onClick={goToday}
              className={`flex-1 text-[10px] py-1.5 rounded-lg font-bold ${colors.accentBg} ${colors.accent} ${colors.hover}`}>
              📅 امروز
            </button>
          )}
          {showClear && (
            <button 
              type="button" 
              onClick={() => onChange?.('')}
              className="flex-1 text-[10px] py-1.5 rounded-lg font-bold bg-gray-100 text-gray-600 hover:bg-gray-200">
              ✕ پاک
            </button>
          )}
        </div>
      )}
    </div>
  );
}
