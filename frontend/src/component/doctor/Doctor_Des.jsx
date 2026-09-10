import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaHospital, FaCalendarCheck, FaUserMd, FaFileMedical, FaPrescriptionBottleAlt,
  FaCheckCircle, FaMicroscope, FaChartBar, FaBed, FaSignOutAlt,
  FaStar, FaBars, FaTimes, FaClock, FaPhoneAlt, FaEnvelope,
  FaMapMarkerAlt, FaHeartbeat, FaFlask,
  FaStethoscope, FaVial,
} from "react-icons/fa";
import { MdEmergency } from "react-icons/md";

/* ── STATIC UI DATA (test type names — not DB records) ── */
const LAB_TESTS = [
  "CBC (Complete Blood Count)", "Lipid Profile",
  "Blood Glucose - Fasting", "Urine Routine",
  "Thyroid Profile (TSH)", "Liver Function Test",
  "X-Ray Chest PA", "ECG 12-Lead",
  "HbA1c", "Serum Creatinine",
];

const NAV = [
  { key: "schedule", icon: <FaCalendarCheck />, label: "Schedule" },
  { key: "patient", icon: <FaUserMd />, label: "Patient Info" },
  { key: "notes", icon: <FaFileMedical />, label: "Consultation" },
  { key: "prescription", icon: <FaPrescriptionBottleAlt />, label: "Prescription" },
  { key: "lab", icon: <FaFlask />, label: "Lab Tests" },
  { key: "reports", icon: <FaChartBar />, label: "Lab Reports" },
  { key: "rooms", icon: <FaBed />, label: "Rooms" },
];

const defaultDoctor = {
  name: "Dr. Doctor",
  role: "General Physician",
  avatar: "https://randomuser.me/api/portraits/men/32.jpg",
  rating: "4.9",
  exp: "10 yrs exp",
};

const BASE = "http://localhost:8080/api/doctor";

/* ── COMPONENT ────────────────────────────────────────── */
export default function Doctor_Des() {
  const navigate = useNavigate();

  const userData = JSON.parse(localStorage.getItem("user") || "{}");
  const doctorNameDisplay = userData.name
    ? (userData.name.toLowerCase().startsWith("dr") ? userData.name : `Dr. ${userData.name}`)
    : defaultDoctor.name;

  const doctor = {
    ...defaultDoctor,
    name: doctorNameDisplay,
    role: userData.role ? (userData.role.charAt(0).toUpperCase() + userData.role.slice(1)) : defaultDoctor.role,
    avatar: userData.avatar || defaultDoctor.avatar,
  };

  const [active, setActive] = useState("schedule");
  const [sideOpen, setSideOpen] = useState(false);

  // Schedule
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [appts, setAppts] = useState([]);
  const [apptLoading, setApptLoading] = useState(true);

  // Patient Info
  const [selPt, setSelPt] = useState("");   // appointment _id
  const [patientData, setPatientData] = useState(null);
  const [ptLoading, setPtLoading] = useState(false);

  // Consultation Notes
  const [notes, setNotes] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [savedNotes, setSavedNotes] = useState({});

  // Prescription
  const [rxRows, setRxRows] = useState([{ medicineId: "", dose: "", freq: "", days: "" }]);
  const [availableMeds, setAvailableMeds] = useState([]);

  // Lab Tests
  const [selTests, setSelTests] = useState([]);

  // Lab Reports
  const [labReports, setLabReports] = useState([]);
  const [repLoading, setRepLoading] = useState(false);

  // Rooms
  const [rooms, setRooms] = useState([]);
  const [roomLoading, setRoomLoading] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);

  const token = () => localStorage.getItem("token");
  const authH = () => ({ Authorization: "Bearer " + token() });
  const jsonH = () => ({ "Content-Type": "application/json", ...authH() });

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2800); };

  /* ── FETCH SCHEDULE on mount ── */
  const fetchSchedule = useCallback(() => {
    setApptLoading(true);
    fetch(`${BASE}/schedule?date=${filterDate}`, { headers: authH() })
      .then(r => r.json())
      .then(d => {
        setAppts(Array.isArray(d) ? d.map(a => ({
          _id: a._id,
          patientId: a.patientId?._id,
          time: a.slot,
          name: a.patientId?.name || "Unknown",
          age: "-",
          reason: "Consultation",
          status: a.status,
          date: a.date
        })) : []); setApptLoading(false);
      })
      .catch((e) => { console.error(e); setApptLoading(false); });
  }, [filterDate]);

  useEffect(() => {
    if (!token()) return navigate("/login");
    fetchSchedule();
  }, [navigate, fetchSchedule]);

  /* ── FETCH PATIENT DETAIL when selPt changes ── */
  useEffect(() => {
    if (!selPt || active !== "patient") return;
    const appt = appts.find(a => a._id === selPt);
    if (!appt?.patientId) { setPatientData(null); return; }
    setPtLoading(true);
    fetch(`${BASE}/patient/${appt.patientId}`, { headers: authH() })
      .then(r => r.json())
      .then(data => setPatientData(data))
      .catch(console.error)
      .finally(() => setPtLoading(false));
  }, [selPt, active]); // eslint-disable-line

  /* ── FETCH MEDICINES when prescription tab opens ── */
  useEffect(() => {
    if (active !== "prescription" || availableMeds.length > 0) return;
    fetch(`${BASE}/medicines`, { headers: authH() })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setAvailableMeds(data); })
      .catch(console.error);
  }, [active]); // eslint-disable-line

  /* ── FETCH LAB REPORTS when tab opens ── */
  useEffect(() => {
    if (active !== "reports") return;
    setRepLoading(true);
    fetch(`${BASE}/reports`, { headers: authH() })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setLabReports(data); })
      .catch(console.error)
      .finally(() => setRepLoading(false));
  }, [active]); // eslint-disable-line

  /* ── FETCH ROOMS when tab opens ── */
  useEffect(() => {
    if (active !== "rooms") return;
    setRoomLoading(true);
    fetch(`${BASE}/rooms`, { headers: authH() })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setRooms(data); })
      .catch(console.error)
      .finally(() => setRoomLoading(false));
  }, [active]); // eslint-disable-line

  /* ── MARK SEEN (persists to DB) ── */
  const markSeen = async (apptId) => {
    try {
      await fetch(`${BASE}/appointment/${apptId}/seen`, { method: "PATCH", headers: authH() });
      setAppts(a => a.map(x => x._id === apptId ? { ...x, status: "completed" } : x));
      showToast("Appointment marked as seen ✓");
    } catch (e) {
      console.error(e);
      showToast("Failed to update — check connection");
    }
  };

  /* ── SAVE CONSULTATION NOTES ── */
  const saveNotes = async () => {
    const appt = appts.find(a => a._id === selPt);
    if (!appt?.patientId) { showToast("Select a patient first"); return; }
    try {
      const res = await fetch(`${BASE}/consultation`, {
        method: "POST", headers: jsonH(),
        body: JSON.stringify({ patientId: appt.patientId, appointmentId: selPt, symptoms: notes, diagnosis, notes }),
      });
      if (res.ok) {
        setSavedNotes(n => ({ ...n, [selPt]: { notes, diagnosis } }));
        showToast("Consultation saved ✓");
      } else {
        const d = await res.json();
        showToast(d.message || "Save failed");
      }
    } catch (e) { showToast("Network error"); }
  };

  /* ── GENERATE PRESCRIPTION ── */
  const generatePrescription = async () => {
    const appt = appts.find(a => a._id === selPt);
    if (!appt?.patientId) { showToast("Select a patient first"); return; }
    const medicines = rxRows.filter(r => r.medicineId).map(r => ({
      medicineId: r.medicineId,
      dosage: r.dose,
      duration: r.days + " days",
      quantity: parseInt(r.days, 10) * (r.freq.includes("Twice") ? 2 : r.freq.includes("Thrice") ? 3 : 1) || 1,
    }));
    if (medicines.length === 0) { showToast("Add at least one medicine"); return; }
    try {
      const res = await fetch(`${BASE}/prescription`, {
        method: "POST", headers: jsonH(),
        body: JSON.stringify({ consultationId: selPt, patientId: appt.patientId, medicines }),
      });
      if (res.ok) {
        setRxRows([{ medicineId: "", dose: "", freq: "", days: "" }]);
        showToast("Prescription sent to pharmacy ✓");
      } else {
        const d = await res.json();
        showToast(d.message || "Failed");
      }
    } catch (e) { showToast("Network error"); }
  };

  /* ── ORDER LAB TESTS ── */
  const orderTests = async () => {
    const appt = appts.find(a => a._id === selPt);
    if (!appt?.patientId) { showToast("Select a patient first"); return; }
    if (selTests.length === 0) { showToast("Select at least one test"); return; }
    try {
      await Promise.all(selTests.map(t =>
        fetch(`${BASE}/lab-request`, {
          method: "POST", headers: jsonH(),
          body: JSON.stringify({ patientId: appt.patientId, testType: t, notes: "" }),
        })
      ));
      setSelTests([]);
      showToast(`${selTests.length} test(s) ordered ✓`);
    } catch (e) { showToast("Network error"); }
  };

  /* ── Helpers ── */
  const toggleTest = t => setSelTests(s => s.includes(t) ? s.filter(x => x !== t) : [...s, t]);
  const addRxRow = () => setRxRows(r => [...r, { medicineId: "", dose: "", freq: "", days: "" }]);
  const removeRx = i => setRxRows(r => r.filter((_, idx) => idx !== i));
  const updateRx = (i, f, v) => setRxRows(r => r.map((x, idx) => idx === i ? { ...x, [f]: v } : x));

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  /* ── Derived patient from patientData ── */
  const pt = patientData?.patient;

  return (
    <div className="font-sans text-slate-800 bg-white min-h-screen overflow-x-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Lora:ital,wght@0,600;1,500&display=swap');
        * { font-family: 'Nunito', sans-serif; box-sizing: border-box; }
        .font-display { font-family: 'Lora', serif; }
        .teal-grad { background: linear-gradient(135deg, #0d9488, #14b8a6, #2dd4bf); }
        .teal-grad-soft { background: linear-gradient(135deg, #f0fdfa, #ccfbf1, #e0f2fe); }
        .emergency-bar { background: linear-gradient(90deg,#0f766e,#0d9488,#14b8a6,#0d9488,#0f766e); background-size:200%; animation: shimmer 3s linear infinite; }
        @keyframes shimmer { 0%{background-position:0%} 100%{background-position:200%} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp .45s ease-out both; }
        .card-hover { transition: all .25s cubic-bezier(.4,0,.2,1); }
        .card-hover:hover { transform: translateY(-4px); box-shadow: 0 16px 32px rgba(20,184,166,.14); }
        .nav-active { background: linear-gradient(135deg,#f0fdfa,#ccfbf1); border-left: 3px solid #14b8a6 !important; color: #0d9488 !important; }
        .nav-item { border-left: 3px solid transparent; transition: all .18s; }
        .nav-item:hover { background: #f0fdfa; color: #0d9488; }
        input:focus, select:focus, textarea:focus { outline: none; border-color: #14b8a6; box-shadow: 0 0 0 3px rgba(20,184,166,.12); }
        .pulse-dot::after { content:''; position:absolute; inset:0; border-radius:50%; background:rgba(20,184,166,.4); animation: pulse-ring 2s ease-out infinite; }
        @keyframes pulse-ring { 0%{transform:scale(.9);opacity:.7} 100%{transform:scale(1.5);opacity:0} }
        .toast-in { animation: toastIn .3s ease-out both; }
        @keyframes toastIn { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* ══ EMERGENCY BAR ══ */}
      <div className="emergency-bar text-white text-xs py-2 px-6 flex justify-center items-center gap-6 font-semibold tracking-wide">
        <span className="flex items-center gap-2">
          <MdEmergency className="text-sm" /> 24/7 Emergency: <strong>+91 98765 43210</strong>
        </span>
        <span className="hidden sm:inline text-teal-200">|</span>
        <span className="hidden sm:flex items-center gap-2">
          <FaClock className="text-xs" /> OPD Hours: Mon–Sat, 8AM – 8PM
        </span>
      </div>

      {/* ══ TOPBAR ══ */}
      <header className="sticky top-0 z-50 bg-white/97 backdrop-blur-md border-b border-teal-100 shadow-sm shadow-teal-100/40">
        <div className="mx-auto px-6 py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl teal-grad flex items-center justify-center shadow-md shadow-teal-300/40">
              <FaHospital className="text-white text-base" />
            </div>
            <div>
              <div className="font-black text-slate-800 text-sm leading-tight">Medikiosk</div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 bg-teal-50 border border-teal-100 rounded-full px-5 py-1.5">
            <FaStethoscope className="text-teal-500 text-sm" />
            <span className="text-sm font-bold text-teal-700">Doctor Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <div className="text-sm font-black text-slate-700">{doctor.name}</div>
              <div className="text-xs text-teal-600 font-semibold">{doctor.role}</div>
            </div>
            <div className="relative">
              <img src={doctor.avatar} alt={doctor.name}
                className="w-9 h-9 rounded-xl border-2 border-teal-200 object-cover" />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white" />
            </div>
            <button className="md:hidden p-2 rounded-xl text-slate-500 hover:bg-teal-50 transition-all"
              onClick={() => setSideOpen(!sideOpen)}>
              {sideOpen ? <FaTimes /> : <FaBars />}
            </button>
          </div>
        </div>
      </header>

      {/* ══ LAYOUT ══ */}
      <div className="flex" style={{ minHeight: "calc(100vh - 112px)" }}>

        {/* ── SIDEBAR ── */}
        <aside className={`
          fixed md:sticky md:top-0 z-40 md:z-auto
          w-64 bg-white border-r border-teal-100 shadow-xl md:shadow-none
          flex flex-col transition-transform duration-300 pt-4
          ${sideOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `} style={{ height: "calc(100vh - 88px)", top: "88px" }}>

          <div className="mx-3 mb-4 p-4 rounded-2xl teal-grad-soft border border-teal-100">
            <div className="flex items-center gap-3">
              <img src={doctor.avatar} className="w-11 h-11 rounded-xl border-2 border-teal-200 object-cover" alt="" />
              <div>
                <div className="font-black text-slate-800 text-sm leading-tight">{doctor.name}</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <FaStar className="text-amber-400 text-[10px]" />
                  <span className="text-[11px] font-bold text-slate-500">{doctor.rating} · {doctor.exp}</span>
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
              {[
                { n: appts.length, l: "Total" },
                { n: appts.filter(a => a.status === "completed").length, l: "Seen" },
                { n: appts.filter(a => a.status === "confirmed").length, l: "Waiting" },
              ].map(({ n, l }) => (
                <div key={l} className="bg-white/70 rounded-xl py-1.5">
                  <div className="text-base font-black text-teal-600">{n}</div>
                  <div className="text-[10px] text-slate-400 font-semibold">{l}</div>
                </div>
              ))}
            </div>
          </div>

          <nav className="flex flex-col gap-0.5 px-2 flex-1 overflow-y-auto">
            {NAV.map(n => (
              <button key={n.key}
                className={`nav-item flex items-center gap-3 px-4 py-2.5 rounded-r-2xl text-sm font-bold text-left w-full
                  ${active === n.key ? "nav-active" : "text-slate-500"}`}
                onClick={() => { setActive(n.key); setSideOpen(false); }}>
                <span className={`text-base ${active === n.key ? "text-teal-500" : "text-slate-400"}`}>{n.icon}</span>
                {n.label}
              </button>
            ))}
          </nav>

          <div className="p-3">
            <button
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 text-sm font-bold rounded-2xl transition-all"
              onClick={() => { localStorage.clear(); navigate("/login"); }}>
              <FaSignOutAlt /> Sign Out
            </button>
          </div>
        </aside>

        {sideOpen && (
          <div className="fixed inset-0 bg-black/20 z-30 md:hidden" onClick={() => setSideOpen(false)} />
        )}

        {/* ── MAIN ── */}
        <main className="flex-1 p-6 overflow-auto teal-grad-soft">

          {/* Toast */}
          {toast && (
            <div className="toast-in mb-4 inline-flex items-center gap-2.5 bg-emerald-500 text-white text-sm font-bold px-5 py-3 rounded-2xl shadow-lg shadow-emerald-300/30">
              <FaCheckCircle /> {toast}
            </div>
          )}

          {/* Global Date Control */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 bg-white border border-teal-100 px-3 py-1.5 rounded-full shadow-sm">
              <FaClock className="text-teal-400 text-[10px]" /> {today}
            </span>

            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-teal-200 shadow-sm">
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Filter Date:</label>
              <input
                type="date"
                className="text-sm font-bold text-teal-700 outline-none bg-transparent cursor-pointer"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
            </div>
          </div>

          {/* ╔══════════════════════════════════════╗
              ║  1. SCHEDULE                         ║
              ╚══════════════════════════════════════╝ */}
          {active === "schedule" && (
            <div className="fade-up bg-white rounded-3xl border border-teal-100 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-teal-50 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-bold text-slate-800">Daily Appointment Schedule</h2>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">
                    {appts.length} appointments · {appts.filter(a => a.status === "completed").length} completed
                  </p>
                </div>
              </div>
              {apptLoading ? (
                <div className="py-16 text-center text-slate-400 font-semibold">Loading schedule…</div>
              ) : appts.length === 0 ? (
                <div className="py-16 text-center text-slate-400 font-semibold">No appointments today.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-teal-50/60">
                        {["Time", "Patient", "Age", "Reason", "Status", "Actions"].map(h => (
                          <th key={h} className="text-left text-xs font-black text-slate-400 uppercase tracking-wider px-5 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {appts.map(a => (
                        <tr key={a._id}
                          className={`border-t border-slate-50 hover:bg-teal-50/30 transition-colors ${a._id === selPt ? "bg-teal-50/50" : ""}`}>
                          <td className="px-5 py-4 font-black text-teal-700 text-sm">
                            {a.time}
                            <div className="text-[10px] text-slate-400">{new Date(a.date).toLocaleDateString()}</div>
                          </td>
                          <td className="px-5 py-4 font-bold text-slate-700 text-sm">{a.name}</td>
                          <td className="px-5 py-4 text-slate-500 text-sm">{a.age}</td>
                          <td className="px-5 py-4 text-slate-500 text-sm">{a.reason}</td>
                          <td className="px-5 py-4">
                            {a.status === "completed" && (
                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-bold px-3 py-1 rounded-full">
                                <FaCheckCircle className="text-[10px]" /> Seen
                              </span>
                            )}
                            {a.status === "confirmed" && (
                              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-100 text-xs font-bold px-3 py-1 rounded-full">
                                <FaClock className="text-[10px]" /> Waiting
                              </span>
                            )}
                            {!["completed", "confirmed"].includes(a.status) && (
                              <span className="inline-flex items-center gap-1.5 bg-teal-50 text-teal-700 border border-teal-200 text-xs font-bold px-3 py-1 rounded-full">
                                <span className="relative w-2 h-2 pulse-dot flex-shrink-0">
                                  <span className="block w-2 h-2 rounded-full bg-teal-400" />
                                </span>
                                {a.status}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex gap-2">
                              <button
                                className="text-xs font-bold px-3 py-1.5 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700 rounded-xl transition-all"
                                onClick={() => { setSelPt(a._id); setActive("patient"); }}>
                                View
                              </button>
                              <button
                                className="text-xs font-bold px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl transition-all"
                                onClick={() => navigate(`/summary-review?patientId=${encodeURIComponent(a.patientId)}`)}
                              >
                                Summary
                              </button>
                              {a.status !== "completed" && (
                                <button
                                  className="text-xs font-bold px-3 py-1.5 teal-grad text-white rounded-xl hover:opacity-90 transition-all shadow-sm shadow-teal-300/30"
                                  onClick={() => markSeen(a._id)}>
                                  Mark Seen
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ╔══════════════════════════════════════╗
              ║  2. PATIENT INFO                     ║
              ╚══════════════════════════════════════╝ */}
          {active === "patient" && (
            <div className="fade-up space-y-5">
              <div className="bg-white rounded-3xl border border-teal-100 shadow-sm p-6">
                <h2 className="font-display text-xl font-bold text-slate-800 mb-4">
                  Patient Information &amp; Medical History
                </h2>
                <div className="mb-5">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                    Select Patient
                  </label>
                  <select
                    className="border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 bg-white w-72"
                    value={selPt}
                    onChange={e => setSelPt(e.target.value)}>
                    <option value="">-- Select an appointment --</option>
                    {appts.map(a => <option key={a._id} value={a._id}>{a.time} — {a.name}</option>)}
                  </select>
                </div>

                {ptLoading ? (
                  <div className="py-10 text-center text-slate-400 font-semibold">Loading patient data…</div>
                ) : pt ? (
                  <div className="grid lg:grid-cols-2 gap-6">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-14 h-14 rounded-2xl teal-grad flex items-center justify-center text-white font-black text-xl shadow-md shadow-teal-300/30">
                          {(pt.userId?.name || "P")[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-black text-slate-800 text-lg">{pt.userId?.name || "Patient"}</div>
                          <div className="text-sm text-slate-400 font-semibold">
                            {pt.userId?.email}
                          </div>
                        </div>
                      </div>

                      {pt.allergies?.length > 0 && (
                        <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold px-4 py-2.5 rounded-xl mb-4">
                          Allergy: {pt.allergies.join(", ")}
                        </div>
                      )}

                      <div className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">Past Consultations</div>
                      {patientData.consultations?.length > 0 ? patientData.consultations.map((c, i) => (
                        <div key={i} className="flex gap-3 items-start bg-teal-50/60 border border-teal-100 rounded-xl px-4 py-3 mb-2 text-sm text-slate-600">
                          <FaFileMedical className="text-teal-400 mt-0.5 flex-shrink-0" />
                          <span><strong>{c.diagnosis || "Consultation"}</strong> — {c.notes || "No notes"}</span>
                        </div>
                      )) : (
                        <div className="text-slate-400 text-sm py-4">No past consultations on record.</div>
                      )}
                    </div>

                    <div>
                      <div className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">Room / Admission</div>
                      {pt.roomId ? (
                        <div className="bg-teal-50 border border-teal-100 rounded-xl px-4 py-3 text-sm font-semibold text-teal-700 mb-4">
                          Room: {pt.roomId.roomNumber || pt.roomId._id} — {pt.roomId.type}
                        </div>
                      ) : (
                        <div className="text-slate-400 text-sm mb-4">Not admitted / outpatient</div>
                      )}

                      <div className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">Vitals (if recorded)</div>
                      {pt.vitals && Object.keys(pt.vitals).length > 0 ? (
                        <div className="grid grid-cols-2 gap-3">
                          {Object.entries(pt.vitals).map(([k, v]) => (
                            <div key={k} className="bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-100 rounded-2xl p-4 text-center card-hover">
                              <FaHeartbeat className="text-teal-400 text-xl mx-auto mb-1" />
                              <div className="font-black text-teal-700 text-sm">{v}</div>
                              <div className="text-xs text-slate-400 font-bold mt-0.5">{k}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-slate-400 text-sm">No vitals recorded yet.</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-400 text-sm py-8 text-center">
                    {selPt ? "No records found for this patient." : "Select an appointment above to view patient details."}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ╔══════════════════════════════════════╗
              ║  3. CONSULTATION NOTES               ║
              ╚══════════════════════════════════════╝ */}
          {active === "notes" && (
            <div className="fade-up bg-white rounded-3xl border border-teal-100 shadow-sm p-6">
              <h2 className="font-display text-xl font-bold text-slate-800 mb-5">
                Consultation Notes &amp; Diagnosis
              </h2>
              <div className="mb-5">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Patient</label>
                <select
                  className="border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 bg-white w-72"
                  value={selPt} onChange={e => setSelPt(e.target.value)}>
                  <option value="">-- Select appointment --</option>
                  {appts.map(a => <option key={a._id} value={a._id}>{a.time} — {a.name}</option>)}
                </select>
              </div>
              <div className="grid md:grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Consultation Notes</label>
                  <textarea
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 bg-slate-50 min-h-40 resize-y"
                    placeholder="Chief complaint, examination findings, observations..."
                    value={notes} onChange={e => setNotes(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Diagnosis / ICD-10</label>
                  <textarea
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 bg-slate-50 min-h-40 resize-y"
                    placeholder="Final diagnosis and ICD-10 codes..."
                    value={diagnosis} onChange={e => setDiagnosis(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  className="flex items-center gap-2 px-6 py-2.5 teal-grad text-white text-sm font-bold rounded-xl shadow-md shadow-teal-300/30 hover:opacity-90 transition-all"
                  onClick={saveNotes}>
                  <FaCheckCircle /> Save Notes
                </button>
                <button
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-bold rounded-xl transition-all"
                  onClick={() => { setNotes(""); setDiagnosis(""); }}>
                  Clear
                </button>
              </div>
              {savedNotes[selPt] && (
                <div className="mt-5 bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
                  <div className="font-bold text-emerald-700 text-sm mb-2 flex items-center gap-2">
                    <FaCheckCircle /> Last Saved Record
                  </div>
                  <div className="text-sm text-slate-600"><span className="font-bold">Notes:</span> {savedNotes[selPt].notes || "—"}</div>
                  <div className="text-sm text-slate-600 mt-1"><span className="font-bold">Diagnosis:</span> {savedNotes[selPt].diagnosis || "—"}</div>
                </div>
              )}
            </div>
          )}

          {/* ╔══════════════════════════════════════╗
              ║  4. PRESCRIPTION                     ║
              ╚══════════════════════════════════════╝ */}
          {active === "prescription" && (
            <div className="fade-up bg-white rounded-3xl border border-teal-100 shadow-sm p-6">
              <h2 className="font-display text-xl font-bold text-slate-800 mb-1">Digital Prescription</h2>
              <p className="text-xs text-slate-400 font-semibold mb-5">Generate and send prescriptions directly to pharmacy</p>
              <div className="mb-5">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Patient</label>
                <select
                  className="border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 bg-white w-72"
                  value={selPt} onChange={e => setSelPt(e.target.value)}>
                  <option value="">-- Select appointment --</option>
                  {appts.map(a => <option key={a._id} value={a._id}>{a.time} — {a.name}</option>)}
                </select>
              </div>

              <div className="hidden md:grid grid-cols-[2fr_1fr_1.5fr_1fr_40px] gap-3 mb-2 px-1">
                {["Medicine", "Dose", "Frequency", "Days", ""].map(h => (
                  <span key={h} className="text-xs font-black uppercase tracking-wider text-slate-400">{h}</span>
                ))}
              </div>

              {rxRows.map((row, i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1.5fr_1fr_40px] gap-3 mb-3 items-center">
                  <select
                    className="border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 bg-slate-50 w-full"
                    value={row.medicineId || ""}
                    onChange={e => updateRx(i, "medicineId", e.target.value)}>
                    <option value="">Select Medicine</option>
                    {availableMeds.map(m => (
                      <option key={m._id} value={m._id}>{m.name} (Stock: {m.stockQuantity})</option>
                    ))}
                  </select>
                  <input
                    className="border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 bg-slate-50 w-full"
                    placeholder="500mg" value={row.dose}
                    onChange={e => updateRx(i, "dose", e.target.value)} />
                  <select
                    className="border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 bg-slate-50 w-full"
                    value={row.freq} onChange={e => updateRx(i, "freq", e.target.value)}>
                    <option value="">Frequency</option>
                    {["Once daily", "Twice daily", "Thrice daily", "SOS", "Before meals", "After meals"].map(f => (
                      <option key={f}>{f}</option>
                    ))}
                  </select>
                  <input
                    className="border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 bg-slate-50 w-full"
                    placeholder="7 days" value={row.days}
                    onChange={e => updateRx(i, "days", e.target.value)} />
                  <button
                    className="w-10 h-10 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-500 text-sm font-bold rounded-xl transition-all flex items-center justify-center"
                    onClick={() => removeRx(i)}>
                    <FaTimes />
                  </button>
                </div>
              ))}

              <div className="flex gap-3 mt-4">
                <button
                  className="flex items-center gap-2 px-5 py-2.5 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700 text-sm font-bold rounded-xl transition-all"
                  onClick={addRxRow}>
                  + Add Row
                </button>
                <button
                  className="flex items-center gap-2 px-6 py-2.5 teal-grad text-white text-sm font-bold rounded-xl shadow-md shadow-teal-300/30 hover:opacity-90 transition-all"
                  onClick={generatePrescription}>
                  <FaPrescriptionBottleAlt /> Generate &amp; Send
                </button>
              </div>
            </div>
          )}

          {/* ╔══════════════════════════════════════╗
              ║  5. LAB TESTS                        ║
              ╚══════════════════════════════════════╝ */}
          {active === "lab" && (
            <div className="fade-up bg-white rounded-3xl border border-teal-100 shadow-sm p-6">
              <h2 className="font-display text-xl font-bold text-slate-800 mb-1">Request Laboratory Tests</h2>
              <p className="text-xs text-slate-400 font-semibold mb-5">Select and order tests for the patient</p>
              <div className="mb-5">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Patient</label>
                <select
                  className="border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 bg-white w-72"
                  value={selPt} onChange={e => setSelPt(e.target.value)}>
                  <option value="">-- Select appointment --</option>
                  {appts.map(a => <option key={a._id} value={a._id}>{a.time} — {a.name}</option>)}
                </select>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
                {LAB_TESTS.map(t => {
                  const on = selTests.includes(t);
                  return (
                    <div key={t}
                      className={`cursor-pointer rounded-2xl border-2 px-4 py-3 flex items-center gap-3 transition-all card-hover ${on ? "border-teal-300 bg-teal-50" : "border-slate-100 bg-slate-50 hover:border-teal-200"}`}
                      onClick={() => toggleTest(t)}>
                      <FaVial className={`flex-shrink-0 text-sm ${on ? "text-teal-500" : "text-slate-300"}`} />
                      <span className={`text-sm font-bold flex-1 ${on ? "text-teal-700" : "text-slate-600"}`}>{t}</span>
                      {on && <FaCheckCircle className="text-teal-400 text-xs flex-shrink-0" />}
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-3">
                <button
                  className={`flex items-center gap-2 px-6 py-2.5 teal-grad text-white text-sm font-bold rounded-xl shadow-md shadow-teal-300/30 hover:opacity-90 transition-all ${selTests.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                  disabled={selTests.length === 0}
                  onClick={orderTests}>
                  <FaMicroscope /> Order {selTests.length > 0 ? `${selTests.length} ` : ""}Test(s)
                </button>
                <button
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-bold rounded-xl transition-all"
                  onClick={() => setSelTests([])}>
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* ╔══════════════════════════════════════╗
              ║  6. LAB REPORTS                      ║
              ╚══════════════════════════════════════╝ */}
          {active === "reports" && (
            <div className="fade-up bg-white rounded-3xl border border-teal-100 shadow-sm p-6">
              <h2 className="font-display text-xl font-bold text-slate-800 mb-5">Laboratory Test Reports</h2>
              {repLoading ? (
                <div className="py-12 text-center text-slate-400 font-semibold">Loading reports…</div>
              ) : labReports.length === 0 ? (
                <div className="py-12 text-center text-slate-400 font-semibold">No lab reports found.</div>
              ) : (
                <div className="space-y-4">
                  {labReports.map((r, i) => {
                    const ready = r.status === "completed";
                    const patName = r.patientId?.userId?.name || "Patient";
                    const date = new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
                    return (
                      <div key={i}
                        className={`rounded-2xl border-2 p-5 card-hover ${ready ? "border-teal-100 bg-teal-50/30" : "border-amber-100 bg-amber-50/30"}`}>
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${ready ? "teal-grad" : "bg-amber-100"}`}>
                              <FaFlask className={`text-sm ${ready ? "text-white" : "text-amber-600"}`} />
                            </div>
                            <div>
                              <div className="font-black text-slate-800">{r.testType}</div>
                              <div className="text-xs text-slate-400 font-semibold">{patName} · {date}</div>
                            </div>
                          </div>
                          {ready
                            ? <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-bold px-3 py-1 rounded-full flex-shrink-0">
                              <FaCheckCircle className="text-[10px]" /> Ready
                            </span>
                            : <span className="flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-100 text-xs font-bold px-3 py-1 rounded-full flex-shrink-0">
                              <FaClock className="text-[10px]" /> Pending
                            </span>
                          }
                        </div>
                        {r.resultDetails && (
                          <div className="bg-white border border-teal-100 rounded-xl px-4 py-3 text-sm text-slate-600 font-semibold flex justify-between items-center">
                            <span>{r.resultDetails}</span>
                            {r.fileUrl && (
                              <a href={r.fileUrl.replace('/upload/', '/upload/fl_attachment/')} target="_blank" rel="noreferrer" className="text-teal-600 hover:text-teal-800 underline text-xs ml-4 flex-shrink-0 flex items-center gap-1">
                                <FaFileMedical /> View Photo
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ╔══════════════════════════════════════╗
              ║  7. ROOMS                            ║
              ╚══════════════════════════════════════╝ */}
          {active === "rooms" && (
            <div className="fade-up space-y-5">
              {roomLoading ? (
                <div className="py-16 text-center text-slate-400 font-semibold">Loading rooms…</div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: "Available", count: rooms.filter(r => r.status === "available").length, cls: "text-emerald-600" },
                      { label: "Occupied", count: rooms.filter(r => r.status === "occupied").length, cls: "text-rose-500" },
                      { label: "Total", count: rooms.length, cls: "text-teal-600" },
                    ].map(s => (
                      <div key={s.label} className="bg-white rounded-2xl border border-teal-100 shadow-sm p-5 text-center card-hover">
                        <div className={`text-3xl font-black ${s.cls}`}>{s.count}</div>
                        <div className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-wider">{s.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-white rounded-3xl border border-teal-100 shadow-sm p-6">
                    <h2 className="font-display text-xl font-bold text-slate-800 mb-5">Room Availability</h2>
                    {rooms.length === 0 ? (
                      <div className="text-center text-slate-400 py-8">No rooms in the system yet.</div>
                    ) : (
                      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {rooms.map(r => {
                          const avail = r.status === "available";
                          const patName = r.currentPatientId?.userId?.name || null;
                          return (
                            <div key={r._id}
                              className={`rounded-2xl border-2 p-4 card-hover ${avail ? "border-emerald-100 bg-emerald-50/40" : "border-rose-100 bg-rose-50/40"}`}>
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-black text-slate-700 text-base">Room {r.roomNumber || r._id}</span>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${avail ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                                  {avail ? "Free" : "Occupied"}
                                </span>
                              </div>
                              <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">{r.type}</div>
                              {patName
                                ? <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
                                  <FaUserMd className="text-rose-400 text-[10px]" /> {patName}
                                </div>
                                : <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                                  <FaCheckCircle className="text-[10px]" /> Ready for admission
                                </div>
                              }
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

        </main>
      </div>

      {/* ══ FOOTER ══ */}
      <footer className="bg-slate-900 text-white py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl teal-grad flex items-center justify-center shadow-md">
              <FaHospital className="text-white text-base" />
            </div>
            <div>
              <div className="font-black text-white text-sm leading-tight">Medikiosk</div>
              <div className="text-[10px] text-teal-400 font-bold tracking-widest">DOCTOR PORTAL · {doctor.name}</div>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-400">
            <span className="flex items-center gap-2 hover:text-teal-400 transition cursor-pointer">
              <FaPhoneAlt className="text-teal-500 text-xs" /> +91 98765 43210
            </span>
            <span className="flex items-center gap-2 hover:text-teal-400 transition cursor-pointer">
              <FaEnvelope className="text-teal-500 text-xs" /> care@multispecialist.in
            </span>
            <span className="flex items-center gap-2">
              <FaMapMarkerAlt className="text-teal-500 text-xs" /> Surat, Gujarat
            </span>
          </div>
          <p className="text-xs text-slate-500">© 2026 Medikiosk · All Rights Reserved</p>
        </div>
      </footer>
    </div>
  );
}