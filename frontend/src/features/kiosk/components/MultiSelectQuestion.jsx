import React, { useState } from 'react';
import { FaCheck, FaArrowRight } from 'react-icons/fa';
import { getKioskStrings } from '../utils/kioskLocalization';

export default function MultiSelectQuestion({ question, onSubmit, disabled, language = 'en' }) {
  const [selected, setSelected] = useState(new Set());
  const strings = getKioskStrings(language);

  if (!question || !Array.isArray(question.options)) return null;

  const toggleSelection = (value) => {
    const newSelected = new Set(selected);
    if (value === 'none') {
      if (newSelected.has('none')) {
        newSelected.delete('none');
      } else {
        newSelected.clear();
        newSelected.add('none');
      }
    } else {
      newSelected.delete('none');
      if (newSelected.has(value)) {
        newSelected.delete(value);
      } else {
        newSelected.add(value);
      }
    }
    setSelected(newSelected);
  };

  const handleSubmit = () => {
    if (selected.size === 0 || disabled) return;
    onSubmit(Array.from(selected), 'touch');
  };

  return (
    <div className="space-y-6 my-4">
      <div className="text-xs font-black uppercase tracking-wider text-teal-700 bg-teal-50 px-3 py-1.5 rounded-full inline-block border border-teal-200">
        {strings.selectAllThatApply}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {question.options.map((option) => {
          const isSelected = selected.has(option.value);
          return (
            <button
              key={option.value}
              type="button"
              className={`group flex items-center justify-between min-h-[64px] px-5 py-4 rounded-2xl border-2 text-left transition-all duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                isSelected
                  ? 'border-teal-600 bg-teal-50/80 text-teal-950 shadow-sm shadow-teal-100 ring-1 ring-teal-500'
                  : 'border-slate-200 bg-white hover:border-teal-400 hover:bg-slate-50 text-slate-800'
              }`}
              onClick={() => toggleSelection(option.value)}
              disabled={disabled}
            >
              <span className="font-bold text-base sm:text-lg pr-3">
                {option.label}
              </span>
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                  isSelected
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'border-2 border-slate-300 bg-white group-hover:border-teal-400'
                }`}
              >
                {isSelected && <FaCheck className="text-xs" />}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="button"
          className="teal-grad text-white font-bold text-base sm:text-lg px-8 py-3.5 rounded-xl shadow-md shadow-teal-300/40 hover:opacity-90 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          onClick={handleSubmit}
          disabled={disabled || selected.size === 0}
        >
          <span>{strings.continueBtn} {selected.size > 0 ? `(${selected.size})` : ''}</span>
          <FaArrowRight className="text-sm" />
        </button>
      </div>
    </div>
  );
}
