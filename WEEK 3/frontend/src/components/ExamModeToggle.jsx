import React from 'react';

export default function ExamModeToggle({ examMode, refreshing, onToggle }) {
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        id="exam-mode-toggle"
        className={`toggle-btn ${examMode ? 'exam' : 'normal'}`}
        onClick={onToggle}
        disabled={refreshing}
        aria-pressed={examMode}
      >
        {refreshing ? (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite' }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            Refreshing…
          </>
        ) : examMode ? (
          'Exam Mode: ON'
        ) : (
          'Enable Exam Mode'
        )}
      </button>
      <p className="text-xs text-slate-400">
        {examMode
          ? 'High-sensitivity · α = 0.75 fixed'
          : 'Normal · α auto-optimised'}
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
