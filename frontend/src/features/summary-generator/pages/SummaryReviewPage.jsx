import React, { useState, useRef } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import {
  FaArrowLeft,
  FaFileMedical,
  FaStethoscope,
  FaVial,
  FaClock,
  FaTriangleExclamation,
  FaVolumeHigh,
  FaLanguage,
  FaRotateRight,
  FaPrescriptionBottleMedical,
  FaFlask,
  FaFolderOpen,
  FaCircleExclamation,
  FaXmark,
  FaUserInjured,
  FaNotesMedical,
  FaHeartPulse,
  FaPills,
  FaPeopleRoof,
  FaUserTag,
  FaCircleCheck,
  FaCalendarDays
} from 'react-icons/fa6';
import StatusBadge from '../components/StatusBadge';
import SummaryCard from '../components/SummaryCard';
import SummarySectionEditor from '../components/SummarySectionEditor';
import { useSummary } from '../hooks/useSummary';
import { getAudioStreamUrl } from '../services/summaryApi';

/**
 * Returns visual badge styling for investigation flags.
 */
function getInvestigationFlagBadge(flag) {
  const f = (flag || '').toLowerCase();
  switch (f) {
    case 'normal':
      return {
        label: 'NORMAL',
        className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        dot: 'bg-emerald-500'
      };
    case 'high':
      return {
        label: 'HIGH',
        className: 'bg-rose-50 text-rose-700 border border-rose-300 font-bold',
        dot: 'bg-rose-500'
      };
    case 'low':
      return {
        label: 'LOW',
        className: 'bg-amber-50 text-amber-700 border border-amber-300 font-bold',
        dot: 'bg-amber-500'
      };
    case 'abnormal':
    case 'critical':
      return {
        label: 'ABNORMAL',
        className: 'bg-rose-100 text-rose-800 border border-rose-400 font-black',
        dot: 'bg-rose-600'
      };
    default:
      return {
        label: (flag || 'RECORDED').toUpperCase(),
        className: 'bg-slate-100 text-slate-700 border border-slate-200',
        dot: 'bg-slate-400'
      };
  }
}

export default function SummaryReviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Dynamic patient ID: URL query > location state > fallback
  const resolvedPatientId =
    searchParams.get('patientId') ||
    location.state?.patientId ||
    location.state?.patient?._id ||
    localStorage.getItem('hmsPatientId') ||
    null;

  const {
    summary,
    formData,
    activeLang,
    isLoading,
    isSubmitting,
    hindiLoading,
    error,
    toast,
    hideToast,
    loadSummary,
    handleFieldChange,
    handleUpdateStatus,
    setActiveLang,
    handleSwitchToHindi
  } = useSummary(resolvedPatientId);

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef(null);

  const handlePlayAudio = () => {
    if (!summary?._id) return;
    try {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audioUrl = getAudioStreamUrl(summary._id, activeLang);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      setIsPlayingAudio(true);

      audio.onended = () => setIsPlayingAudio(false);
      audio.onerror = () => setIsPlayingAudio(false);

      audio.play().catch(() => setIsPlayingAudio(false));
    } catch {
      setIsPlayingAudio(false);
    }
  };

  // Group document timeline items by type
  const timelineGroups = {
    prescription: { label: 'Prescriptions', icon: <FaPrescriptionBottleMedical />, items: [] },
    lab: { label: 'Lab Reports', icon: <FaFlask />, items: [] },
    document: { label: 'Other Uploads', icon: <FaFolderOpen />, items: [] }
  };

  if (summary?.documentTimeline && Array.isArray(summary.documentTimeline)) {
    summary.documentTimeline.forEach((item) => {
      const key = timelineGroups[item.type] ? item.type : 'document';
      timelineGroups[key].items.push(item);
    });
  }

  const hasTimelineItems = Object.values(timelineGroups).some((g) => g.items.length > 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col">
      {/* ── TOP DOCTOR BAR ── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
          {/* Back Action & Title */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/doctor-dashboard')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-slate-700 transition-all cursor-pointer shadow-xs"
              title="Return to Doctor Dashboard"
            >
              <FaArrowLeft className="text-slate-500 text-xs" />
              <span className="hidden sm:inline">Doctor Dashboard</span>
            </button>

            <div className="h-5 w-px bg-slate-200 hidden sm:block" />

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center text-sm shadow-xs">
                <FaNotesMedical />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-none">
                  Clinical Summary &amp; Review
                </h1>
                <p className="text-[11px] text-slate-500 font-medium">
                  AI-Synthesized Consultation Record &amp; Timeline
                </p>
              </div>
            </div>
          </div>

          {/* Quick Refresh */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadSummary(resolvedPatientId)}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-200 text-xs font-bold text-teal-700 transition-all cursor-pointer disabled:opacity-50"
              title="Refresh summary data"
            >
              <FaRotateRight className={`text-xs ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Reload</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── TOAST NOTIFICATION BANNER (REPLACES NATIVE alert()) ── */}
      {toast && (
        <div className="sticky top-[57px] z-20 px-4 py-2">
          <div
            className={`max-w-xl mx-auto rounded-xl p-3 shadow-md flex items-center justify-between gap-3 text-xs font-semibold animate-fade-in ${
              toast.type === 'error'
                ? 'bg-rose-600 text-white shadow-rose-200'
                : toast.type === 'info'
                ? 'bg-sky-600 text-white shadow-sky-200'
                : 'bg-emerald-600 text-white shadow-emerald-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {toast.type === 'error' ? (
                <FaCircleExclamation className="text-base shrink-0" />
              ) : (
                <FaCircleCheck className="text-base shrink-0" />
              )}
              <span>{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={hideToast}
              className="text-white/80 hover:text-white cursor-pointer ml-2 p-1"
            >
              <FaXmark className="text-sm" />
            </button>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* ── LOADING STATE ── */}
        {isLoading && (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-lg mx-auto shadow-xs my-8 animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center mx-auto mb-4 text-2xl animate-spin">
              <FaRotateRight />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">
              Synthesizing Clinical Summary
            </h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              Merging patient intake, prior prescriptions, and diagnostic lab timeline via Gemini AI...
            </p>
          </div>
        )}

        {/* ── ERROR RECOVERY STATE ── */}
        {!isLoading && error && (
          <div className="bg-white border-2 border-rose-200 rounded-3xl p-8 sm:p-12 text-center max-w-lg mx-auto shadow-xs my-8 animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-4 text-2xl">
              <FaTriangleExclamation />
            </div>
            <h3 className="text-lg font-bold text-rose-950 mb-1">
              Unable to Load Summary
            </h3>
            <p className="text-xs text-rose-700 mb-6 leading-relaxed max-w-sm mx-auto">
              {error}
            </p>
            <button
              type="button"
              onClick={() => loadSummary(resolvedPatientId)}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <FaRotateRight className="text-xs" />
              <span>Retry Generation</span>
            </button>
          </div>
        )}

        {/* ── LOADED SUMMARY CLINICAL INTERFACE ── */}
        {!isLoading && !error && summary && (
          <>
            {/* ── PATIENT & SUMMARY CONTEXT HEADER ── */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              {/* Patient Identifier */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center text-xl font-bold shadow-xs">
                  <FaUserInjured />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                      Patient ID:
                    </span>
                    <code className="text-sm sm:text-base font-bold font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                      {summary.patientId || resolvedPatientId}
                    </code>
                    <StatusBadge status={summary.status} />
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400 font-medium">
                    <span>Record ID: {summary._id?.slice(0, 10)}…</span>
                    {summary.updatedAt && (
                      <span className="flex items-center gap-1">
                        <FaClock className="text-[10px]" />
                        <span>Updated: {new Date(summary.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Action Notice */}
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2">
                <FaNotesMedical className="text-teal-600" />
                <span>Doctor verification required before finalizing medical chart</span>
              </div>
            </div>

            {/* ── TWO-COLUMN CLINICAL DESK GRID ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* ╔═══════════════════════════════════════════════╗
                  ║  LEFT COLUMN: NARRATIVE & CLINICAL HISTORY  ║
                  ╚═══════════════════════════════════════════════╝ */}
              <div className="lg:col-span-7 space-y-6">
                {/* 1. Bilingual Narrative Output Card */}
                <SummaryCard
                  title="Bilingual Clinical Narrative"
                  subtitle="Synthesized clinical intake output"
                  icon={<FaLanguage />}
                  badge={
                    <span className="text-[10px] font-bold uppercase bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-full">
                      EN / HI
                    </span>
                  }
                  action={
                    <div className="flex items-center gap-1.5">
                      {/* English Tab */}
                      <button
                        type="button"
                        onClick={() => setActiveLang('en')}
                        className={`text-xs font-bold px-3 py-1 rounded-lg transition-all cursor-pointer ${
                          activeLang === 'en'
                            ? 'bg-teal-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        English
                      </button>

                      {/* Hindi Tab */}
                      <button
                        type="button"
                        onClick={handleSwitchToHindi}
                        className={`text-xs font-bold px-3 py-1 rounded-lg transition-all cursor-pointer ${
                          activeLang === 'hi'
                            ? 'bg-teal-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        हिन्दी
                      </button>

                      {/* TTS Audio Player */}
                      <button
                        type="button"
                        onClick={handlePlayAudio}
                        disabled={activeLang === 'hi' && hindiLoading}
                        className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-lg border transition-all cursor-pointer ${
                          isPlayingAudio
                            ? 'bg-teal-600 text-white border-teal-700 animate-pulse'
                            : 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100'
                        }`}
                        title="Stream text-to-speech audio"
                      >
                        <FaVolumeHigh />
                        <span>{isPlayingAudio ? 'Playing...' : 'Audio'}</span>
                      </button>
                    </div>
                  }
                >
                  <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 text-xs sm:text-sm text-slate-700 leading-relaxed italic">
                    {activeLang === 'hi' && hindiLoading ? (
                      <div className="flex items-center gap-2 text-teal-700 font-semibold py-2">
                        <FaRotateRight className="animate-spin" />
                        <span>Generating lazy Hindi translation via IndicTrans2...</span>
                      </div>
                    ) : (
                      summary.languageOutputs?.[activeLang] ||
                      summary.languageOutputs?.en ||
                      'No narrative text available.'
                    )}
                  </div>
                </SummaryCard>

                {/* 2. Chief Complaint & HPI (Editable) */}
                <SummaryCard
                  title="Chief Complaint &amp; History of Present Illness"
                  subtitle="Doctor-editable consultation narrative"
                  icon={<FaStethoscope />}
                >
                  <div className="space-y-4">
                    <SummarySectionEditor
                      label="Chief Complaint"
                      value={formData.chiefComplaint}
                      onChange={(val) => handleFieldChange('chiefComplaint', val)}
                      placeholder="e.g. High grade fever with chills for 3 days"
                      rows={2}
                      icon={<FaHeartPulse />}
                    />

                    <SummarySectionEditor
                      label="History of Present Illness (HPI)"
                      value={formData.hpi}
                      onChange={(val) => handleFieldChange('hpi', val)}
                      placeholder="Detailed chronology, associated symptoms, onset..."
                      rows={4}
                      icon={<FaNotesMedical />}
                    />
                  </div>
                </SummaryCard>

                {/* 3. Extended Clinical History (2x2 Grid) */}
                <SummaryCard
                  title="Clinical History Profiles"
                  subtitle="Past, medication, family, and personal history"
                  icon={<FaNotesMedical />}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <SummarySectionEditor
                      label="Past Medical History"
                      value={formData.pastHistory}
                      onChange={(val) => handleFieldChange('pastHistory', val)}
                      placeholder="Chronic illnesses, surgeries, prior hospitalizations..."
                      rows={3}
                      icon={<FaClock />}
                    />

                    <SummarySectionEditor
                      label="Drug &amp; Medication History"
                      value={formData.drugHistory}
                      onChange={(val) => handleFieldChange('drugHistory', val)}
                      placeholder="Current medications, adverse reactions, drug allergies..."
                      rows={3}
                      icon={<FaPills />}
                    />

                    <SummarySectionEditor
                      label="Family Medical History"
                      value={formData.familyHistory}
                      onChange={(val) => handleFieldChange('familyHistory', val)}
                      placeholder="Cardiac events, diabetes, hereditary conditions..."
                      rows={3}
                      icon={<FaPeopleRoof />}
                    />

                    <SummarySectionEditor
                      label="Personal / Social History"
                      value={formData.personalHistory}
                      onChange={(val) => handleFieldChange('personalHistory', val)}
                      placeholder="Smoking status, alcohol, occupation, diet..."
                      rows={3}
                      icon={<FaUserTag />}
                    />
                  </div>
                </SummaryCard>

                {/* 4. Review of Systems (ROS) */}
                <SummaryCard
                  title="Review of Systems (ROS)"
                  subtitle="Systematic review findings from intake questionnaire"
                  icon={<FaHeartPulse />}
                  badge={
                    summary.ros && summary.ros.length > 0 ? (
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
                        {summary.ros.length} flagged
                      </span>
                    ) : null
                  }
                >
                  {summary.ros && Array.isArray(summary.ros) && summary.ros.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {summary.ros.map((item, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-medium flex items-center gap-1.5 shadow-2xs"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center text-xs text-slate-500 font-medium">
                      No positive Review of Systems (ROS) findings reported.
                    </div>
                  )}
                </SummaryCard>
              </div>

              {/* ╔═══════════════════════════════════════════════╗
                  ║  RIGHT COLUMN: INVESTIGATIONS & TIMELINE     ║
                  ╚═══════════════════════════════════════════════╝ */}
              <div className="lg:col-span-5 space-y-6">
                {/* 5. Diagnostic Investigations Section */}
                <SummaryCard
                  title="Diagnostic Investigations"
                  subtitle="Lab reports and diagnostic test values"
                  icon={<FaVial />}
                  badge={
                    summary.investigations && summary.investigations.length > 0 ? (
                      <span className="text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-full">
                        {summary.investigations.length} tests
                      </span>
                    ) : null
                  }
                >
                  {summary.investigations && Array.isArray(summary.investigations) && summary.investigations.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-black tracking-wider">
                            <th className="text-left py-2 px-1">Test Name</th>
                            <th className="text-left py-2 px-2">Value</th>
                            <th className="text-right py-2 px-1">Flag</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {summary.investigations.map((inv, idx) => {
                            const badge = getInvestigationFlagBadge(inv.flag);
                            return (
                              <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                                <td className="py-2.5 px-1 font-semibold text-slate-800">
                                  {inv.name}
                                </td>
                                <td className="py-2.5 px-2 font-mono text-slate-700">
                                  {inv.value}
                                </td>
                                <td className="py-2.5 px-1 text-right">
                                  <span
                                    className={`inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${badge.className}`}
                                  >
                                    <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                                    <span>{badge.label}</span>
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center text-xs text-slate-500 font-medium">
                      <FaVial className="text-slate-300 text-xl mx-auto mb-1.5" />
                      <span>No diagnostic lab investigations recorded for this visit.</span>
                    </div>
                  )}
                </SummaryCard>

                {/* 6. Document Timeline (from Module B) */}
                <SummaryCard
                  title="Document Timeline"
                  subtitle="Prescriptions, Lab Reports &amp; Digitized Records"
                  icon={<FaFileMedical />}
                >
                  {hasTimelineItems ? (
                    <div className="space-y-4">
                      {Object.entries(timelineGroups).map(([groupKey, group]) => {
                        if (group.items.length === 0) return null;
                        return (
                          <div key={groupKey} className="space-y-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                              <span className="text-teal-600 text-sm">{group.icon}</span>
                              <span>{group.label}</span>
                              <span className="text-[10px] text-slate-400 font-normal">
                                ({group.items.length})
                              </span>
                            </div>

                            <div className="space-y-2">
                              {group.items.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="bg-slate-50/80 border border-slate-200 rounded-xl p-3 text-xs space-y-1 shadow-2xs"
                                >
                                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                                    <span className="font-semibold text-slate-600 flex items-center gap-1">
                                      <FaCalendarDays className="text-[10px]" />
                                      {item.date ? new Date(item.date).toLocaleDateString() : 'N/A'}
                                    </span>
                                    {item.sourceDocument && (
                                      <span className="bg-white border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded-md text-[10px]">
                                        {item.sourceDocument}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-slate-800 font-medium leading-relaxed">
                                    {item.event}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center text-xs text-slate-500 font-medium">
                      <FaFolderOpen className="text-slate-300 text-xl mx-auto mb-1.5" />
                      <span>No historical digitized documents attached.</span>
                    </div>
                  )}
                </SummaryCard>
              </div>
            </div>

            {/* ── DOCTOR VERIFICATION ACTION BAR ── */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-4 z-20">
              <div className="text-xs text-slate-500">
                <span className="font-bold text-slate-800 block">Doctor Review Actions</span>
                <span>Select an action to transition the summary status and persist medical chart notes.</span>
              </div>

              <div className="flex items-center flex-wrap gap-2.5 w-full sm:w-auto">
                {/* Accept Action */}
                <button
                  type="button"
                  onClick={() => handleUpdateStatus('accepted')}
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <FaCircleCheck />
                  <span>{isSubmitting ? 'Saving...' : 'Accept Summary'}</span>
                </button>

                {/* Save Amendment Action */}
                <button
                  type="button"
                  onClick={() => handleUpdateStatus('amended')}
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <FaNotesMedical />
                  <span>{isSubmitting ? 'Saving...' : 'Save Amendment'}</span>
                </button>

                {/* Reject Action */}
                <button
                  type="button"
                  onClick={() => handleUpdateStatus('rejected')}
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white hover:bg-rose-50 border border-rose-300 text-rose-600 font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  <FaXmark />
                  <span>{isSubmitting ? 'Saving...' : 'Reject'}</span>
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      {/* ── FOOTER ── */}
      <footer className="bg-white border-t border-slate-200 py-3 text-center text-xs text-slate-400">
        <p>Medikiosk Clinical Review • Powered by Module C LLM Summarizer</p>
      </footer>
    </div>
  );
}