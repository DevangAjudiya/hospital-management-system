import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  FaTriangleExclamation,
  FaBell,
  FaCircleCheck,
  FaRotateRight,
  FaVolumeHigh,
  FaVolumeXmark,
  FaHospital,
  FaClock,
  FaMagnifyingGlass,
  FaFilter,
  FaCircleExclamation,
  FaHeartPulse,
  FaUserInjured,
  FaShieldHeart
} from 'react-icons/fa6';
import { subscribeToTriageAlerts } from './services/triageAlertChannel';

/**
 * Format ISO timestamp into readable time and relative time.
 */
function formatTime(isoString) {
  if (!isoString) return { time: '—', relative: '—' };
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return { time: '—', relative: '—' };

    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);

    let relative = 'Just now';
    if (diffSec >= 60 && diffSec < 3600) {
      relative = `${Math.floor(diffSec / 60)}m ago`;
    } else if (diffSec >= 3600) {
      relative = `${Math.floor(diffSec / 3600)}h ago`;
    }

    return { time, relative };
  } catch {
    return { time: '—', relative: '—' };
  }
}

/**
 * Visual styling rules for different alert severity levels.
 */
function getSeverityBadge(severity) {
  const s = (severity || '').toLowerCase();
  switch (s) {
    case 'critical':
      return {
        bg: 'bg-rose-50',
        border: 'border-rose-300',
        accentBorder: 'border-l-rose-600',
        badgeBg: 'bg-rose-600 text-white',
        pulseDot: 'bg-rose-500',
        label: 'CRITICAL',
        isUrgent: true,
      };
    case 'high':
      return {
        bg: 'bg-amber-50/70',
        border: 'border-amber-200',
        accentBorder: 'border-l-amber-500',
        badgeBg: 'bg-amber-500 text-white',
        pulseDot: 'bg-amber-400',
        label: 'HIGH',
        isUrgent: true,
      };
    case 'medium':
    case 'moderate':
      return {
        bg: 'bg-amber-50/30',
        border: 'border-amber-200/60',
        accentBorder: 'border-l-amber-400',
        badgeBg: 'bg-amber-100 text-amber-800 border border-amber-200',
        pulseDot: 'bg-amber-400',
        label: 'MODERATE',
        isUrgent: false,
      };
    default:
      return {
        bg: 'bg-teal-50/40',
        border: 'border-teal-100',
        accentBorder: 'border-l-teal-500',
        badgeBg: 'bg-teal-100 text-teal-800 border border-teal-200',
        pulseDot: 'bg-teal-400',
        label: (severity || 'LOW').toUpperCase(),
        isUrgent: false,
      };
  }
}

/**
 * Play a web-audio alert chime for critical/high incoming alerts.
 */
function playAlertChime() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // audio context might be blocked or unavailable
  }
}

export default function TriageAlertScreen() {
  const [alerts, setAlerts] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [connectionInfo, setConnectionInfo] = useState('Initializing live alert connection...');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [latestAlertId, setLatestAlertId] = useState(null);
  const [clock, setClock] = useState(new Date().toLocaleTimeString());

  // Keep a ref to alerts for duplicate checking in the subscription callback
  const alertsRef = useRef([]);
  alertsRef.current = alerts;

  // Sound ref to prevent stale closures
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  // Real-time clock display
  useEffect(() => {
    const interval = setInterval(() => {
      setClock(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Alert handler that deduplicates and prepends incoming alerts
  const handleIncomingAlert = useCallback((incoming) => {
    if (!incoming || !incoming.sessionId) return;

    setAlerts((prev) => {
      // Prevent duplicates by checking existing alert IDs or session IDs
      const existingIndex = prev.findIndex(
        (a) => a.id === incoming.id || a.sessionId === incoming.sessionId
      );

      if (existingIndex >= 0) {
        // Update the existing alert record with latest fields without duplicating
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          ...incoming,
          // Preserve first received timestamp if latest doesn't specify
          timestamp: incoming.timestamp || updated[existingIndex].timestamp
        };
        return updated;
      }

      // Play audio chime if critical/high and sound is enabled
      if (soundEnabledRef.current && (incoming.severity === 'critical' || incoming.severity === 'high')) {
        playAlertChime();
      }

      // Mark this alert as newest for flash animation
      setLatestAlertId(incoming.id);

      // Prepend newest alert to the queue
      return [incoming, ...prev];
    });
  }, []);

  // Subscription lifecycle
  const [reconnectKey, setReconnectKey] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeToTriageAlerts({
      onAlert: handleIncomingAlert,
      onStatusChange: (status, info) => {
        setConnectionStatus(status);
        if (info) setConnectionInfo(info);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [handleIncomingAlert, reconnectKey]);

  // Dismiss latest alert banner flash after 5 seconds
  useEffect(() => {
    if (!latestAlertId) return;
    const timer = setTimeout(() => {
      setLatestAlertId(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [latestAlertId]);

  // Filtered and searched alert list
  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      // Severity filter
      if (selectedFilter === 'critical' && alert.severity !== 'critical') return false;
      if (selectedFilter === 'high' && alert.severity !== 'high') return false;
      if (selectedFilter === 'moderate' && alert.severity !== 'medium' && alert.severity !== 'moderate' && alert.severity !== 'low') return false;

      // Text search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesSession = (alert.sessionId || '').toLowerCase().includes(query);
        const matchesPatient = (alert.patientId || '').toLowerCase().includes(query);
        const matchesComplaint = (alert.chiefComplaint || '').toLowerCase().includes(query);
        const matchesReasons = (alert.reasons || []).some((r) => (r || '').toLowerCase().includes(query));
        return matchesSession || matchesPatient || matchesComplaint || matchesReasons;
      }

      return true;
    });
  }, [alerts, selectedFilter, searchQuery]);

  // Severity metrics
  const metrics = useMemo(() => {
    let critical = 0;
    let high = 0;
    let other = 0;

    alerts.forEach((a) => {
      if (a.severity === 'critical') critical++;
      else if (a.severity === 'high') high++;
      else other++;
    });

    return {
      total: alerts.length,
      critical,
      high,
      other
    };
  }, [alerts]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col">
      {/* ── TOP APP BAR ── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Brand & Station Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center text-xl shadow-sm shadow-teal-700/20">
              <FaHospital />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-tight">
                  Triage Live Alert Station
                </h1>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200 tracking-wider">
                   Channel
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Emergency & Clinical Red-Flag Stream Monitoring
              </p>
            </div>
          </div>

          {/* Status, Audio & Clock Controls */}
          <div className="flex items-center flex-wrap gap-2.5 sm:gap-4">
            {/* Connection Status Pill */}
            <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full text-xs font-semibold">
              {connectionStatus === 'connected' && (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-emerald-700 font-bold">Channel Active</span>
                </>
              )}
              {connectionStatus === 'connecting' && (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                  <span className="text-amber-700 font-bold">Connecting...</span>
                </>
              )}
              {(connectionStatus === 'disconnected' || connectionStatus === 'error') && (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="text-rose-700 font-bold">
                    {connectionStatus === 'error' ? 'Channel Error' : 'Disconnected'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setReconnectKey((k) => k + 1)}
                    className="ml-1 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                    title="Reconnect"
                  >
                    <FaRotateRight className="text-xs" />
                  </button>
                </>
              )}
            </div>

            {/* Audio Toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                soundEnabled
                  ? 'bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100'
                  : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'
              }`}
              title={soundEnabled ? 'Alert audio chime enabled' : 'Alert audio muted'}
            >
              {soundEnabled ? <FaVolumeHigh /> : <FaVolumeXmark />}
              <span>{soundEnabled ? 'Chime ON' : 'Muted'}</span>
            </button>

            {/* Digital Clock */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono font-bold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full">
              <FaClock className="text-slate-400" />
              <span>{clock}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── CONNECTION BANNER (IF ERROR OR CONNECTING) ── */}
      {connectionStatus === 'error' && (
        <div className="bg-rose-600 text-white px-4 py-2 text-xs font-semibold text-center flex items-center justify-center gap-2 shadow-inner">
          <FaCircleExclamation />
          <span>{connectionInfo}</span>
          <button
            type="button"
            onClick={() => setReconnectKey((k) => k + 1)}
            className="underline ml-2 font-bold cursor-pointer hover:text-rose-100"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* ── MAIN CONTENT AREA ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* ── SUMMARY METRICS CARDS ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Total */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Alerts</p>
              <p className="text-2xl sm:text-3xl font-black text-slate-800 mt-1">{metrics.total}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center text-xl">
              <FaBell />
            </div>
          </div>

          {/* Critical */}
          <div className="bg-white border-2 border-rose-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-rose-600">Critical Priority</p>
              <p className="text-2xl sm:text-3xl font-black text-rose-600 mt-1">{metrics.critical}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-xl">
              <FaTriangleExclamation />
            </div>
          </div>

          {/* High */}
          <div className="bg-white border border-amber-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-600">High Priority</p>
              <p className="text-2xl sm:text-3xl font-black text-amber-600 mt-1">{metrics.high}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl">
              <FaHeartPulse />
            </div>
          </div>

          {/* Moderate/Low */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-teal-600">Standard / Low</p>
              <p className="text-2xl sm:text-3xl font-black text-teal-700 mt-1">{metrics.other}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center text-xl">
              <FaShieldHeart />
            </div>
          </div>
        </div>

        {/* ── FILTER & SEARCH BAR ── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Severity Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <span className="text-xs font-bold text-slate-400 mr-2 flex items-center gap-1">
              <FaFilter />
              <span>Filter:</span>
            </span>
            {[
              { key: 'all', label: `All (${metrics.total})` },
              { key: 'critical', label: `Critical (${metrics.critical})` },
              { key: 'high', label: `High (${metrics.high})` },
              { key: 'moderate', label: `Other (${metrics.other})` }
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSelectedFilter(tab.key)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  selectedFilter === tab.key
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative flex-1 md:max-w-xs">
            <FaMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            <input
              type="text"
              placeholder="Search session ID, symptom..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* ── ALERT LIST / QUEUE ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <span>Incoming Alert Stream Queue</span>
              <span className="text-xs font-semibold lowercase text-slate-400">
                ({filteredAlerts.length} {filteredAlerts.length === 1 ? 'alert' : 'alerts'})
              </span>
            </h2>
            {alerts.length > 0 && (
              <span className="text-[11px] text-slate-400 font-medium">
                Live stream automatically refreshes when Person 1 emits events
              </span>
            )}
          </div>

          {/* Empty State */}
          {filteredAlerts.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-3xl p-10 sm:p-14 text-center max-w-xl mx-auto shadow-xs my-6">
              <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center mx-auto mb-4 text-2xl shadow-xs">
                <FaCircleCheck />
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-800 mb-1">
                {alerts.length === 0 ? 'No Active Triage Alerts' : 'No Alerts Matching Filter'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed mb-4">
                {alerts.length === 0
                  ? 'All consultation queues are normal. When Person 1\'s real-time alert channel detects a red flag or priority medical symptom, it will appear here instantly.'
                  : 'Try selecting a different filter or clearing your search term.'}
              </p>
              <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full px-4 py-1.5 text-xs font-medium text-slate-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Actively monitoring incoming clinical stream...</span>
              </div>
            </div>
          )}

          {/* Alerts Queue */}
          <div className="space-y-3">
            {filteredAlerts.map((alert) => {
              const sev = getSeverityBadge(alert.severity);
              const { time, relative } = formatTime(alert.timestamp);
              const isNewlyReceived = alert.id === latestAlertId;

              return (
                <article
                  key={alert.id || alert.sessionId}
                  className={`bg-white border rounded-2xl p-5 shadow-xs transition-all border-l-4 ${sev.accentBorder} ${
                    sev.isUrgent ? sev.border : 'border-slate-200'
                  } ${isNewlyReceived ? 'ring-2 ring-teal-500/50 bg-teal-50/20' : ''}`}
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center flex-wrap gap-2">
                      {/* Severity Badge */}
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-black px-2.5 py-1 rounded-lg uppercase tracking-wider ${sev.badgeBg}`}
                      >
                        <FaTriangleExclamation className="text-[11px]" />
                        <span>{sev.label}</span>
                      </span>

                      {/* Status Tag */}
                      <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200">
                        {alert.status}
                      </span>

                      {/* New Alert Ping */}
                      {isNewlyReceived && (
                        <span className="text-[10px] font-black uppercase bg-teal-600 text-white px-2 py-0.5 rounded-full animate-bounce">
                          NEW
                        </span>
                      )}

                      {alert.alertTriggered && (
                        <span className="text-[10px] font-extrabold uppercase bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-full">
                          ⚡ Triggered
                        </span>
                      )}
                    </div>

                    {/* Timestamp & Relative Time */}
                    <div className="text-right flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1">
                      <span className="text-xs font-bold text-slate-700">{time}</span>
                      <span className="text-[10px] text-slate-400 font-medium">{relative}</span>
                    </div>
                  </div>

                  {/* Card Body Details */}
                  <div className="pt-3.5 space-y-3">
                    {/* Session / Patient Identification */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                          Session ID:
                        </span>
                        <code className="bg-slate-100 text-slate-800 font-mono px-2 py-0.5 rounded-md border border-slate-200 font-bold text-xs">
                          {alert.sessionId}
                        </code>
                      </div>

                      {alert.patientId && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                            Patient ID:
                          </span>
                          <span className="font-mono text-slate-700 font-bold">{alert.patientId}</span>
                        </div>
                      )}
                    </div>

                    {/* Chief Complaint (if present) */}
                    {alert.chiefComplaint && (
                      <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 text-xs">
                        <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block mb-0.5">
                          Chief Complaint
                        </span>
                        <p className="text-slate-800 font-semibold">{alert.chiefComplaint}</p>
                      </div>
                    )}

                    {/* Red-Flag Symptoms & Reason */}
                    {alert.reasons && alert.reasons.length > 0 && (
                      <div
                        className={`rounded-xl p-3 text-xs border ${
                          sev.isUrgent
                            ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                            : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        <span
                          className={`font-black uppercase tracking-wider text-[10px] block mb-1.5 ${
                            sev.isUrgent ? 'text-rose-700' : 'text-slate-500'
                          }`}
                        >
                          Red-Flag Clinical Findings / Reasons
                        </span>
                        <ul className="space-y-1">
                          {alert.reasons.map((reason, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-rose-500 font-bold leading-none mt-0.5">•</span>
                              <span className="font-medium leading-relaxed">{reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      {/* ── FOOTER DESK SUMMARY ── */}
      <footer className="bg-white border-t border-slate-200 py-3 text-center text-xs text-slate-400">
        <p>Medikiosk Triage Live Alert Screen • Connected to Person 1's Live Channel</p>
      </footer>
    </div>
  );
}
