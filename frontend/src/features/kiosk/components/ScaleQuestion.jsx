import React, { useState } from 'react';
import { FaArrowRight } from 'react-icons/fa';
import { getKioskStrings } from '../utils/kioskLocalization';

export default function ScaleQuestion({ onSubmit, disabled, language = 'en' }) {
  const [value, setValue] = useState(5);
  const strings = getKioskStrings(language);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const num = Number(value);
    if (isNaN(num) || num < 1 || num > 10 || disabled) return;
    onSubmit(num, 'touch');
  };

  const getSeverityBadge = (val) => {
    if (val <= 3) return { text: strings.mildDiscomfort, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (val <= 6) return { text: strings.moderateIntensity, color: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { text: strings.severeIntense, color: 'bg-rose-50 text-rose-700 border-rose-200' };
  };

  const badge = getSeverityBadge(value);

  return (
    <div className="space-y-6 my-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black uppercase tracking-wider text-slate-500">
          {strings.touchNumber1To10}
        </span>
        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${badge.color}`}>
          {badge.text}
        </span>
      </div>

      {/* Large Touch 1-10 Buttons */}
      <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 sm:gap-2.5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
          const isSelected = value === num;
          return (
            <button
              key={num}
              type="button"
              className={`h-14 sm:h-16 rounded-2xl font-black text-lg sm:text-xl transition-all cursor-pointer flex flex-col items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed ${
                isSelected
                  ? 'teal-grad text-white shadow-md shadow-teal-300/40 scale-105 ring-2 ring-teal-500 ring-offset-2'
                  : 'bg-white border-2 border-slate-200 text-slate-700 hover:border-teal-400 hover:bg-slate-50 active:scale-95'
              }`}
              onClick={() => setValue(num)}
              disabled={disabled}
            >
              <span>{num}</span>
            </button>
          );
        })}
      </div>

      {/* Slider representation */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2">
        <div className="flex justify-between text-xs font-bold text-slate-400">
          <span>1 = {strings.mild}</span>
          <span className="text-sm font-black text-teal-700">{strings.selected}: {value} / 10</span>
          <span>10 = {strings.severe}</span>
        </div>
        <input
          type="range"
          min="1"
          max="10"
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          disabled={disabled}
          className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
        />
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="button"
          className="teal-grad text-white font-bold text-base sm:text-lg px-8 py-3.5 rounded-xl shadow-md shadow-teal-300/40 hover:opacity-90 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleSubmit}
          disabled={disabled || value < 1 || value > 10}
        >
          <span>{strings.confirmRating} ({value})</span>
          <FaArrowRight className="text-sm" />
        </button>
      </div>
    </div>
  );
}
