import React from 'react';
import { FaChevronRight } from 'react-icons/fa';

export default function SingleSelectQuestion({ question, onSubmit, disabled }) {
  if (!question || !Array.isArray(question.options)) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 my-4">
      {question.options.map((option) => (
        <button
          key={option.value}
          type="button"
          className="group relative flex items-center justify-between min-h-[64px] px-5 py-4 rounded-2xl border-2 border-slate-200 bg-white hover:border-teal-500 hover:bg-teal-50/40 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-teal-500 text-left transition-all duration-150 shadow-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          onClick={() => onSubmit(option.value, 'touch')}
          disabled={disabled}
        >
          <span className="font-bold text-base sm:text-lg text-slate-800 group-hover:text-teal-900 pr-3">
            {option.label}
          </span>
          <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-teal-600 group-hover:text-white flex items-center justify-center text-slate-400 flex-shrink-0 transition-colors">
            <FaChevronRight className="text-xs" />
          </div>
        </button>
      ))}
    </div>
  );
}
