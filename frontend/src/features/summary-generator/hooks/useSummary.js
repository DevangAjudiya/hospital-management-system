import { useState, useEffect, useCallback } from 'react';
import {
  getSummaryByPatient,
  updateSummaryStatus,
  fetchHindiTranslation
} from '../services/summaryApi';

/**
 * Custom hook to manage clinical summary fetching, editing, bilingual state, and status transitions.
 * 
 * @param {string} patientId - Target patient identifier
 */
export function useSummary(patientId = null) {
  const [summary, setSummary] = useState(null);
  const [formData, setFormData] = useState({
    chiefComplaint: '',
    hpi: '',
    pastHistory: '',
    drugHistory: '',
    familyHistory: '',
    personalHistory: ''
  });
  const [activeLang, setActiveLang] = useState('en');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hindiLoading, setHindiLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  // Auto-dismiss toast after 4.5 seconds
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Load / fetch saved summary for patient from backend API
  const loadSummary = useCallback(async (targetPid = patientId) => {
    setIsLoading(true);
    setError(null);

    if (!targetPid) {
      console.log('[SUMMARY RETRIEVAL] patientId:', targetPid);
      console.log('[SUMMARY RETRIEVAL] response: No patientId provided');
      setError('Clinical summary has not been generated for this patient yet.');
      setIsLoading(false);
      return;
    }

    try {
      // Fetch the saved summary record from GET /api/summary/by-patient/:patientId
      const data = await getSummaryByPatient(targetPid);

      if (!data) {
        throw new Error(
          'Clinical summary has not been generated for this patient yet.'
        );
      }

      // Update localStorage cache with latest server record
      try {
        localStorage.setItem(`hmsSummary:${targetPid}`, JSON.stringify(data));
      } catch (storageErr) {
        console.warn('[SUMMARY] Could not cache summary to localStorage:', storageErr);
      }

      setSummary(data);
      setFormData({
        chiefComplaint: data.chiefComplaint || '',
        hpi: data.hpi || '',
        pastHistory: data.pastHistory || '',
        drugHistory: data.drugHistory || '',
        familyHistory: data.familyHistory || '',
        personalHistory: data.personalHistory || ''
      });
    } catch (err) {
      console.error('[SUMMARY] Load error:', err);
      setError(err.message || 'Clinical summary has not been generated for this patient yet.');
    } finally {
      setIsLoading(false);
    }
  }, [patientId]);

  // Initial fetch on mount or when patientId changes
  useEffect(() => {
    loadSummary(patientId);
  }, [loadSummary, patientId]);

  // Handle local edits to clinical fields
  const handleFieldChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Accept, Amend, or Reject status transition
  const handleUpdateStatus = useCallback(async (status) => {
    if (!summary || !summary._id) {
      showToast('Summary record ID is missing', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const updatedDoc = await updateSummaryStatus(summary._id, {
        status,
        ...formData
      });

      setSummary(updatedDoc);

      // Persist status change into localStorage cache
      if (patientId) {
        try {
          localStorage.setItem(`hmsSummary:${patientId}`, JSON.stringify(updatedDoc));
        } catch (storageErr) {
          console.warn('[SUMMARY] Could not update localStorage cache:', storageErr);
        }
      }

      // Sync form data with updated doc
      setFormData({
        chiefComplaint: updatedDoc.chiefComplaint || '',
        hpi: updatedDoc.hpi || '',
        pastHistory: updatedDoc.pastHistory || '',
        drugHistory: updatedDoc.drugHistory || '',
        familyHistory: updatedDoc.familyHistory || '',
        personalHistory: updatedDoc.personalHistory || ''
      });

      const statusLabels = {
        accepted: 'Summary accepted and verified successfully',
        amended: 'Summary amendments saved successfully',
        rejected: 'Summary marked as rejected'
      };

      showToast(statusLabels[status] || `Status updated to ${status}`, 'success');
    } catch (err) {
      console.error('[SUMMARY] Status update failed:', err);
      showToast(err.message || 'Failed to update summary status', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [summary, formData, patientId, showToast]);

  // Switch to Hindi tab and trigger on-demand translation if not yet cached
  const handleSwitchToHindi = useCallback(async () => {
    setActiveLang('hi');

    if (!summary) return;
    const cachedHi = summary.languageOutputs?.hi;
    if (cachedHi && !cachedHi.startsWith('[Translation Error')) return; // already translated

    setHindiLoading(true);

    try {
      const hindiText = await fetchHindiTranslation(summary._id);
      setSummary((prev) => ({
        ...prev,
        languageOutputs: {
          ...prev?.languageOutputs,
          hi: hindiText
        }
      }));
    } catch (err) {
      console.error('[SUMMARY] Hindi translation failed:', err);
      showToast('Translation service unavailable. Please try again.', 'error');
    } finally {
      setHindiLoading(false);
    }
  }, [summary, showToast]);

  return {
    summary,
    formData,
    activeLang,
    isLoading,
    isSubmitting,
    hindiLoading,
    error,
    toast,
    showToast,
    hideToast,
    loadSummary,
    handleFieldChange,
    handleUpdateStatus,
    setActiveLang,
    handleSwitchToHindi
  };
}
