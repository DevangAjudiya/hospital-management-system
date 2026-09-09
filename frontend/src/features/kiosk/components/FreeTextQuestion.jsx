import React, { useState } from 'react';
import { FaArrowRight, FaTimes } from 'react-icons/fa';
import { getKioskStrings } from '../utils/kioskLocalization';

export default function FreeTextQuestion({ question, onSubmit, disabled, language = 'en' }) {
  const [text, setText] = useState('');
  const [prevId, setPrevId] = useState(question?.id);
  const strings = getKioskStrings(language);

  if (question?.id !== prevId) {
    setPrevId(question?.id);
    setText('');
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed, 'text');
    setText('');
  };

  return (
    <form className="space-y-4 my-4" onSubmit={handleSubmit}>
      <div className="relative">
        <textarea
          className="w-full min-h-[140px] p-5 rounded-2xl border-2 border-slate-200 bg-white focus:border-teal-500 focus:bg-teal-50/20 text-slate-800 text-base sm:text-lg placeholder-slate-400 focus:outline-none transition-all resize-none shadow-inner"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
          placeholder={strings.freeTextPlaceholder}
          rows={4}
          autoFocus
        />
        {text.length > 0 && !disabled && (
          <button
            type="button"
            className="absolute top-4 right-4 text-xs font-bold text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
            onClick={() => setText('')}
          >
            <FaTimes /> {strings.clear}
          </button>
        )}
      </div>

      <div className="flex justify-between items-center pt-2">
        <span className="text-xs text-slate-400 font-semibold">
          {text.trim().length === 0 ? strings.enterResponseAbove : `${text.trim().length} ${strings.characters}`}
        </span>
        <button
          type="submit"
          className="teal-grad text-white font-bold text-base sm:text-lg px-8 py-3.5 rounded-xl shadow-md shadow-teal-300/40 hover:opacity-90 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          disabled={disabled || !text.trim()}
        >
          <span>{strings.submitResponse}</span>
          <FaArrowRight className="text-sm" />
        </button>
      </div>
    </form>
  );
}
