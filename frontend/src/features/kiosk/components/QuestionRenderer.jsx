import React from 'react';
import SingleSelectQuestion from './SingleSelectQuestion';
import MultiSelectQuestion from './MultiSelectQuestion';
import FreeTextQuestion from './FreeTextQuestion';
import ScaleQuestion from './ScaleQuestion';

export default function QuestionRenderer({ question, onSubmit, disabled, language = 'en' }) {
  if (!question) return null;

  switch (question.type) {
    case 'single_select':
      return (
        <SingleSelectQuestion
          question={question}
          onSubmit={onSubmit}
          disabled={disabled}
          language={language}
        />
      );
    case 'multi_select':
      return (
        <MultiSelectQuestion
          question={question}
          onSubmit={onSubmit}
          disabled={disabled}
          language={language}
        />
      );
    case 'free_text':
      return (
        <FreeTextQuestion
          question={question}
          onSubmit={onSubmit}
          disabled={disabled}
          language={language}
        />
      );
    case 'scale_1_10':
      return (
        <ScaleQuestion
          question={question}
          onSubmit={onSubmit}
          disabled={disabled}
          language={language}
        />
      );
    default:
      return (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold rounded-2xl p-4 my-4">
          Question format "{question.type}" is currently being configured. Please seek staff assistance.
        </div>
      );
  }
}
