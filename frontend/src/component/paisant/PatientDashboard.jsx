import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import PatientNavbar from "./patientNavbar";

export default function PatientDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [reports, setReports] = useState([]);
  const [bills, setBills] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);

  const [prescriptions, setPrescriptions] = useState([]);
  const [selectedPrescription, setSelectedPrescription] = useState(null);

  // Booking state
  const [doctors, setDoctors] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState("");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [bookingMsg, setBookingMsg] = useState("");
  const [checkingSlots, setCheckingSlots] = useState(false);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return navigate("/login");
    fetchData(token);

    // Fetch real doctors from DB
    fetch("http://localhost:8080/api/patient/doctors", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setDoctors(data.map(d => ({ id: d._id, name: d.name })));
        }
      })
      .catch(console.error);
  }, [navigate]);

  // Close modals with Escape for keyboard accessibility
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setSelectedPrescription(null);
        setSelectedBill(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const fetchData = async (token) => {
    const headers = { Authorization: `Bearer ${token}` };
    setLoading(true);
    try {
      const [histRes, repRes, billRes, presRes] = await Promise.all([
        fetch("http://localhost:8080/api/patient/history", { headers }),
        fetch("http://localhost:8080/api/patient/reports", { headers }),
        fetch("http://localhost:8080/api/patient/bills", { headers }),
        fetch("http://localhost:8080/api/patient/prescriptions", { headers })
      ]);

      const histData = histRes.ok ? await histRes.json() : [];
      const repData = repRes.ok ? await repRes.json() : [];
      const billData = billRes.ok ? await billRes.json() : [];
      const presData = presRes.ok ? await presRes.json() : [];

      setHistory(histData);
      setReports(repData);
      setBills(billData);
      setPrescriptions(presData);

      // Extract real Patient._id from existing records and store in hmsPatientId
      const foundPid =
        (Array.isArray(histData) && histData[0]?.patientId) ||
        (Array.isArray(repData) && repData[0]?.patientId) ||
        (Array.isArray(billData) && billData[0]?.patientId) ||
        (Array.isArray(presData) && presData[0]?.patientId);

      if (foundPid) {
        localStorage.setItem("hmsPatientId", foundPid);
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        localStorage.setItem("user", JSON.stringify({ ...user, patientId: foundPid }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const checkAvailability = async (e) => {
    e.preventDefault();
    if (!selectedDoc || !date) return alert("Select doctor and date");
    setCheckingSlots(true);
    setSlots([]);
    setSelectedSlot("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:8080/api/patient/availability?doctorId=${selectedDoc}&date=${date}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSlots(data.availableSlots || []);
        if (data.availableSlots?.length === 0) alert("No slots available on this date");
      }
    } finally {
      setCheckingSlots(false);
    }
  };

  const bookAppointment = async () => {
    if (!selectedSlot) return alert("Select a slot first");
    const token = localStorage.getItem("token");
    setBookingMsg("");
    setBooking(true);
    try {
      const res = await fetch("http://localhost:8080/api/patient/book", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ doctorId: selectedDoc, date, slot: selectedSlot })
      });
      const data = await res.json();
      if (res.ok) {
        if (data?.appointment?.patientId) {
          localStorage.setItem("hmsPatientId", data.appointment.patientId);
          const user = JSON.parse(localStorage.getItem("user") || "{}");
          localStorage.setItem("user", JSON.stringify({ ...user, patientId: data.appointment.patientId }));
        }
        if (data?.appointment) {
          localStorage.setItem(
            "activeAppointment",
            JSON.stringify({
              appointmentId: data.appointment._id,
              doctorId: data.appointment.doctorId,
              patientId: data.appointment.patientId,
              date: data.appointment.date,
              slot: data.appointment.slot,
              status: data.appointment.status
            })
          );
        }

        setBookingMsg("✅ Appointment booked! Check the Doctor dashboard.");
        setSelectedSlot("");
        setSlots([]);
        setDate("");
        fetchData(token);
      } else {
        setBookingMsg("❌ " + (data.message || "Booking failed"));
      }
    } finally {
      setBooking(false);
    }
  };

  const payFinalBill = async (billId) => {
    const token = localStorage.getItem("token");
    const res = await fetch("http://localhost:8080/api/billing/process-final-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ billId, paymentMethod: "Online Banking" })
    });
    const data = await res.json();
    if (res.ok) {
      alert("Final bill paid! Patient is officially discharged.");
      fetchData(token);
    } else {
      alert(data.message);
    }
  };

  const downloadPDF = async (prescription) => {
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF();

      doc.setFontSize(18);
      doc.text("Digital Prescription", 105, 15, { align: "center" });

      doc.setFontSize(12);
      doc.text(`Patient: ${JSON.parse(localStorage.getItem("user") || "{}").name || "Patient"}`, 14, 25);
      doc.text(`Doctor: Dr. ${prescription.doctorId?.name || "Unknown"}`, 14, 32);
      doc.text(`Status: ${prescription.status.toUpperCase()}`, 14, 39);

      const tableColumn = ["Sr No", "Medicine", "Dose & Frequency", "Duration", "Quantity"];
      const tableRows = [];

      prescription.medicines.forEach((m, index) => {
        const rowData = [
          index + 1,
          m.medicineId?.name || "Unknown",
          m.dosage || "-",
          m.duration || "-",
          m.quantity || "-"
        ];
        tableRows.push(rowData);
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 45,
        theme: "grid",
        headStyles: { fillColor: [54, 162, 235], textColor: 255, fontStyle: "bold" },
        styles: { fontSize: 10, cellPadding: 3 }
      });

      doc.save(`Prescription_${prescription._id}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Failed to download PDF. Please try again.");
    }
  };

  const downloadBillPDF = async (bill) => {
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF();

      doc.setFontSize(18);
      doc.text("Medical Invoice", 105, 15, { align: "center" });

      doc.setFontSize(12);
      doc.text(`Patient: ${JSON.parse(localStorage.getItem("user") || "{}").name || "Patient"}`, 14, 25);
      doc.text(`Invoice Status: ${bill.status.toUpperCase()}`, 14, 32);

      const tableColumn = ["Description", "Amount (INR)"];
      const tableRows = [
        ["Doctor Consultation Fee", `Rs. ${bill.consultationFee || 0}`],
        ["Laboratory Charges", `Rs. ${bill.labCharges || 0}`],
        ["Pharmacy & Medicines", `Rs. ${bill.medicineCost || 0}`],
        ["Room Charges", `Rs. ${bill.roomCharges || 0}`]
      ];

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 40,
        theme: "grid",
        headStyles: { fillColor: [54, 162, 235], textColor: 255, fontStyle: "bold" },
        styles: { fontSize: 11, cellPadding: 4 }
      });

      const finalY = doc.lastAutoTable.finalY || 100;
      doc.setFontSize(14);
      doc.text(`Gross Total: Rs. ${bill.totalAmount || 0}`, 14, finalY + 15);
      doc.setTextColor(220, 38, 38);
      doc.text(`Total Due: Rs. ${bill.finalAmountDue || 0}`, 14, finalY + 23);

      doc.save(`Invoice_${bill._id}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Failed to download Invoice PDF. Please try again.");
    }
  };

  const closeOnBackdrop = useCallback((e, closeFn) => {
    if (e.target === e.currentTarget) closeFn(null);
  }, []);

  return (
    <>
      <PatientNavbar />

      <div className="min-h-screen bg-slate-50 font-sans p-4 sm:p-8">
        <div className="max-w-6xl mx-auto space-y-8">

          {/* BOOKING SECTION */}
          <section
            id="appointments"
            className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-teal-100 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-2 h-full bg-teal-500" />
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-800">Book new appointment</h2>
              <p className="text-sm text-slate-500 mt-1">Pick a provider and date to see open time slots.</p>
            </div>

            <form onSubmit={checkAvailability} className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <label htmlFor="doctor-select" className="block text-sm font-bold text-slate-600 mb-2">
                  Provider
                </label>
                <select
                  id="doctor-select"
                  required
                  className="w-full border-2 border-slate-200 p-3 rounded-xl focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-colors disabled:bg-slate-50 disabled:text-slate-400"
                  value={selectedDoc}
                  onChange={e => setSelectedDoc(e.target.value)}
                  disabled={doctors.length === 0}
                >
                  <option value="">
                    {doctors.length === 0 ? "Loading providers…" : "-- Choose speciality/doctor --"}
                  </option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 w-full">
                <label htmlFor="date-select" className="block text-sm font-bold text-slate-600 mb-2">
                  Date
                </label>
                <input
                  id="date-select"
                  required
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full border-2 border-slate-200 p-3 rounded-xl focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-colors"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={checkingSlots}
                className="bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white px-8 py-3 rounded-xl font-bold transition-colors shadow-sm w-full md:w-auto h-[52px] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-teal-500"
              >
                {checkingSlots ? "Searching…" : "Search slots"}
              </button>
            </form>

            {checkingSlots && (
              <div className="mt-6 flex gap-3 flex-wrap">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-11 w-20 rounded-xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            )}

            {!checkingSlots && slots.length > 0 && (
              <div className="mt-8 pt-6 border-t border-slate-100">
                <label className="block text-sm font-bold text-slate-600 mb-4">
                  Available time slots for {date}
                </label>
                <div className="flex gap-3 flex-wrap mb-6" role="group" aria-label="Available time slots">
                  {slots.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSelectedSlot(s)}
                      aria-pressed={selectedSlot === s}
                      className={`px-5 py-2.5 border-2 rounded-xl font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-teal-500 ${
                        selectedSlot === s
                          ? "bg-teal-600 text-white border-teal-600 shadow-md -translate-y-0.5"
                          : "bg-white text-teal-700 border-teal-200 hover:border-teal-400"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <button
                  onClick={bookAppointment}
                  disabled={!selectedSlot || booking}
                  className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-bold shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500"
                >
                  {booking ? "Booking…" : "Book appointment"}
                </button>
                {bookingMsg && (
                  <p
                    role="status"
                    className={`mt-4 font-bold text-sm ${bookingMsg.startsWith("✅") ? "text-emerald-600" : "text-rose-600"}`}
                  >
                    {bookingMsg}
                  </p>
                )}
              </div>
            )}
          </section>

          {/* DATA PANELS */}
          <div id="records" className="flex flex-col gap-6">
            <Panel title="Medical history" icon="🏥" loading={loading} empty={!history.length} emptyText="No historical records found">
              {history.map((h, i) => (
                <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-sm font-semibold text-slate-800 mb-1">{h.diagnosis || "Consultation"}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{h.notes}</p>
                </div>
              ))}
            </Panel>

            <Panel title="Lab reports" icon="🔬" loading={loading} empty={!reports.length} emptyText="No lab reports available">
              {reports.map((r, i) => (
                <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-sm font-bold text-teal-700 mb-1 flex justify-between items-center gap-2">
                    <span>{r.testType}</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full shrink-0">READY</span>
                  </p>
                  <p className="text-xs text-slate-600 font-mono mt-2">{r.resultDetails}</p>
                  {r.fileUrl && (
                    <a
                      href={r.fileUrl.replace("/upload/", "/upload/fl_attachment/")}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block mt-3 bg-teal-100 hover:bg-teal-200 text-teal-800 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-teal-500"
                    >
                      🖼️ View photo report
                    </a>
                  )}
                </div>
              ))}
            </Panel>

            <Panel title="Billing & invoices" icon="💳" loading={loading} empty={!bills.length} emptyText="No active bills">
              {bills.map((b, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-xl border-2 flex flex-col gap-3 ${b.finalAmountDue > 0 ? "bg-rose-50 border-rose-100" : "bg-emerald-50 border-emerald-100"}`}
                >
                  <div>
                    <div className="flex justify-between items-center mb-1 gap-2">
                      <p className="text-sm font-black text-slate-800">Total: ₹{b.totalAmount || 0}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${b.status === "paid" ? "bg-emerald-200 text-emerald-800" : "bg-amber-200 text-amber-800"}`}>
                        {b.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">Due: <span className="font-bold text-rose-600">₹{b.finalAmountDue || 0}</span></p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedBill(b)}
                      className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold py-2 rounded-lg transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400"
                    >
                      👁️ View invoice
                    </button>
                    {b.finalAmountDue > 0 && (
                      <button
                        onClick={() => payFinalBill(b._id)}
                        className="flex-1 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold py-2 rounded-lg transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-rose-500"
                      >
                        Pay due
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </Panel>

            <Panel title="Prescriptions" icon="💊" loading={loading} empty={!prescriptions.length} emptyText="No prescriptions">
              {prescriptions.map((p, i) => (
                <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <p className="text-sm font-black text-teal-800">Dr. {p.doctorId?.name}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${p.status === "dispensed" ? "bg-emerald-200 text-emerald-800" : "bg-amber-200 text-amber-800"}`}>
                      {p.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">{p.medicines?.length || 0} medicines</p>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedPrescription(p)}
                      className="flex-1 bg-teal-100 hover:bg-teal-200 text-teal-800 text-xs font-bold py-2 rounded-lg transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-teal-500"
                    >
                      👁️ View
                    </button>
                    <button
                      onClick={() => downloadPDF(p)}
                      className="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs font-bold py-2 rounded-lg transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                    >
                      📄 PDF
                    </button>
                  </div>
                </div>
              ))}
            </Panel>
          </div>

          {selectedPrescription && (
            <div
              className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-[fadeIn_.15s_ease-out]"
              onMouseDown={(e) => closeOnBackdrop(e, setSelectedPrescription)}
            >
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh] animate-[popIn_.15s_ease-out]">
                <div className="bg-teal-800 p-4 flex justify-between items-center">
                  <h3 className="text-white font-bold text-lg">Digital prescription</h3>
                  <button
                    onClick={() => setSelectedPrescription(null)}
                    aria-label="Close"
                    className="text-teal-200 hover:text-white font-bold text-2xl leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded"
                  >
                    &times;
                  </button>
                </div>
                <div className="p-6 overflow-y-auto">
                  <div className="mb-4">
                    <p className="text-xs text-slate-500 uppercase font-black tracking-wider">Prescribed by</p>
                    <p className="text-lg font-bold text-slate-800">Dr. {selectedPrescription.doctorId?.name}</p>
                  </div>
                  <table className="w-full text-sm mt-4 text-left">
                    <thead>
                      <tr className="border-b-2 border-slate-200 text-slate-600">
                        <th className="pb-2">Medicine</th>
                        <th className="pb-2">Dose & freq</th>
                        <th className="pb-2 text-right">Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedPrescription.medicines?.map((m, idx) => (
                        <tr key={idx}>
                          <td className="py-3 font-semibold text-teal-800">{m.medicineId?.name || "Unknown"}</td>
                          <td className="py-3 text-slate-600 font-mono text-xs">{m.dosage} <br /> {m.duration}</td>
                          <td className="py-3 text-right font-black text-slate-800">{m.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="bg-slate-50 p-4 border-t flex justify-end gap-3">
                  <button
                    onClick={() => downloadPDF(selectedPrescription)}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                  >
                    Download PDF
                  </button>
                  <button
                    onClick={() => setSelectedPrescription(null)}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-2 rounded-lg text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectedBill && (
            <div
              className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-[fadeIn_.15s_ease-out]"
              onMouseDown={(e) => closeOnBackdrop(e, setSelectedBill)}
            >
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh] animate-[popIn_.15s_ease-out]">
                <div className="bg-slate-800 p-4 flex justify-between items-center">
                  <h3 className="text-white font-bold text-lg">Itemized invoice</h3>
                  <button
                    onClick={() => setSelectedBill(null)}
                    aria-label="Close"
                    className="text-slate-300 hover:text-white font-bold text-2xl leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded"
                  >
                    &times;
                  </button>
                </div>
                <div className="p-6 overflow-y-auto">
                  <div className="mb-4">
                    <p className="text-xs text-slate-500 uppercase font-black tracking-wider">Patient name</p>
                    <p className="text-lg font-bold text-slate-800">
                      {JSON.parse(localStorage.getItem("user") || "{}").name || "Patient"}
                    </p>
                  </div>

                  <table className="w-full text-sm mt-4 text-left border rounded-xl overflow-hidden shadow-sm">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200 text-slate-600">
                        <th className="p-3">Description</th>
                        <th className="p-3 text-right">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="p-3 font-medium text-slate-700">Doctor consultation</td>
                        <td className="p-3 text-right text-slate-800">{selectedBill.consultationFee || 0}</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium text-slate-700">Laboratory charges</td>
                        <td className="p-3 text-right text-slate-800">{selectedBill.labCharges || 0}</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium text-slate-700">Pharmacy & medicines</td>
                        <td className="p-3 text-right text-slate-800">{selectedBill.medicineCost || 0}</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium text-slate-700">Room charges</td>
                        <td className="p-3 text-right text-slate-800">{selectedBill.roomCharges || 0}</td>
                      </tr>
                    </tbody>
                    <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                      <tr>
                        <th className="p-3 text-right font-bold text-slate-800">Gross total:</th>
                        <td className="p-3 text-right font-black text-lg text-slate-800">₹{selectedBill.totalAmount || 0}</td>
                      </tr>
                      <tr>
                        <th className="px-3 pb-3 pt-1 text-right font-bold tracking-wide text-rose-600">Total due:</th>
                        <td className="px-3 pb-3 pt-1 text-right font-black text-rose-600">₹{selectedBill.finalAmountDue || 0}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div className="bg-slate-50 p-4 border-t flex justify-end gap-3">
                  <button
                    onClick={() => downloadBillPDF(selectedBill)}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                  >
                    Download PDF
                  </button>
                  <button
                    onClick={() => setSelectedBill(null)}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-2 rounded-lg text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes popIn { from { opacity: 0; transform: scale(.96) translateY(4px) } to { opacity: 1; transform: scale(1) translateY(0) } }
        @media (prefers-reduced-motion: reduce) {
          .animate-\\[fadeIn_\\.15s_ease-out\\], .animate-\\[popIn_\\.15s_ease-out\\] { animation: none !important; }
        }
      `}</style>
    </>
  );
}

// Small stat tile for the overview strip. Purely additive — no new colors, reuses existing palette.
function SummaryStat({ label, value, accent }) {
  const styles = {
    slate: "border-slate-100 text-slate-800",
    teal: "border-teal-100 text-teal-800",
    amber: "border-amber-100 text-amber-800",
    rose: "border-rose-100 text-rose-700",
    emerald: "border-emerald-100 text-emerald-700"
  };
  return (
    <div className={`bg-white rounded-2xl border p-4 shadow-sm ${styles[accent] || styles.slate}`}>
      <p className="text-2xl font-black leading-none">{value}</p>
      <p className="text-xs font-semibold text-slate-500 mt-1.5">{label}</p>
    </div>
  );
}

// Shared card shell for the four record panels: handles loading skeleton and empty state consistently.
function Panel({ title, icon, loading, empty, emptyText, children }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
      <h3 className="font-bold text-xl text-slate-800 mb-4 flex items-center gap-2">
        <span aria-hidden="true">{icon}</span> {title}
      </h3>
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-slate-50 border border-slate-100 animate-pulse" />
            ))}
          </div>
        ) : empty ? (
          <div className="flex items-center justify-center text-slate-400 font-semibold text-sm text-center px-4 py-10">
            {emptyText}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}