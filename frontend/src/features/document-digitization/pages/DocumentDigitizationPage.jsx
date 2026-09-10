import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FaUserCircle, FaArrowLeft, FaCheckCircle, FaSpinner } from "react-icons/fa";
import { useOcrProcessor } from "../hooks/useOcrProcessor";
import { analyzeDocumentWithDevang } from "../services/devangService";
import { generateSummary } from "../../summary-generator/services/summaryApi";
import UploadPanel from "../components/UploadPanel";
import EntityExtractionTable from "../components/EntityExtractionTable";
import OcrResultViewer from "../components/OcrResultViewer";
import DocumentTimeline from "../components/DocumentTimeline";

export default function DocumentDigitizationPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const patientId = location.state?.patientId || localStorage.getItem("hmsPatientId") || user.patientId || null;

  const { isProcessing: isOcrProcessing, rawTextLines, extractedEntities, error: ocrError, processFile } = useOcrProcessor();
  const [activeDocument, setActiveDocument] = useState(null);
  const [docType, setDocType] = useState("prescription");

  const [devangStatus, setDevangStatus] = useState({
    loading: false,
    step: "",
    success: false,
    error: null,
    devangData: null,
    summaryData: null
  });

  const [processedHistory, setProcessedHistory] = useState([]);

  const handleFileUpload = async (file, selectedType) => {
    const currentDocType = selectedType || docType;
    setActiveDocument(file);

    // 1. Trigger local OCR parser (for PDF previews & LOINC extraction)
    processFile(file);

    // 2. Trigger Devang Document Microservice & Consultation Summary sync
    setDevangStatus({
      loading: true,
      step: `Analyzing ${currentDocType === "lab" ? "lab report" : "prescription"} with Devang AI...`,
      success: false,
      error: null,
      devangData: null,
      summaryData: null
    });

    try {
      // Call Devang's endpoint: /analyze for prescription, /analyze-lab-report for lab
      const devangRaw = await analyzeDocumentWithDevang(file, currentDocType);

      // Call backend POST /api/summary/generate with analyzedDocuments & same patientId
      setDevangStatus({
        loading: true,
        step: "Syncing extracted document data into patient clinical summary...",
        success: false,
        error: null,
        devangData: devangRaw,
        summaryData: null
      });

      const effectivePid = patientId || "kiosk-patient-default";
      const summaryResult = await generateSummary({
        patientId: effectivePid,
        analyzedDocuments: [
          {
            type: currentDocType,
            data: devangRaw
          }
        ]
      });

      console.log("[DOCUMENT WORKFLOW] Summary sync successful:", summaryResult);

      setDevangStatus({
        loading: false,
        step: "Completed",
        success: true,
        error: null,
        devangData: devangRaw,
        summaryData: summaryResult
      });

      setProcessedHistory(prev => [
        {
          id: Date.now(),
          name: file.name,
          type: currentDocType,
          date: new Date().toLocaleTimeString(),
          status: "Digitized & Synced"
        },
        ...prev
      ]);
    } catch (err) {
      console.error("[DOCUMENT WORKFLOW] Error during analysis or summary sync:", err);
      setDevangStatus({
        loading: false,
        step: "Failed",
        success: false,
        error: err.message || "Failed to process document with AI.",
        devangData: null,
        summaryData: null
      });
    }
  };

  const isAnyProcessing = isOcrProcessing || devangStatus.loading;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Emergency Bar (Matches Site Theme) */}
      <div className="bg-teal-700 text-white text-xs py-2 px-8 flex justify-between items-center">
        <div>📞 24/7 Emergency: +91 98765 43210</div>
        <div>🕒 OPD Hours: Mon–Sat, 8AM – 8PM</div>
      </div>

      {/* Main Navigation Bar */}
      <nav className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-500 flex items-center justify-center text-white font-bold text-xl">
            🏥
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-800 leading-none">Medikiosk</h1>
          </div>
        </div>

        <div className="flex items-center gap-6 text-sm font-medium text-slate-600">
          <Link to="/" className="hover:text-teal-600">Home</Link>
          <Link to="/patient-dashboard" className="hover:text-teal-600">Patient Portal</Link>
          <Link to="/kiosk" className="hover:text-teal-600">Kiosk</Link>
          <Link to="/login" className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg font-semibold transition">
            Login
          </Link>
        </div>
      </nav>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Patient Context Banner if arriving from consultation */}
        {patientId && (
          <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-3 text-teal-900">
              <FaUserCircle className="text-2xl text-teal-600 shrink-0" />
              <div>
                <span className="font-bold">Active Patient Session:</span>{" "}
                <span className="font-mono bg-white px-2 py-0.5 rounded border border-teal-200 text-teal-800 text-xs font-semibold">
                  {patientId}
                </span>
                <p className="text-xs text-teal-700 mt-0.5">
                  Uploaded documents are automatically extracted and merged into this patient's clinical summary.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate("/kiosk")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-teal-200 hover:bg-teal-100 text-teal-800 font-bold text-xs rounded-xl transition cursor-pointer self-start sm:self-auto"
            >
              <FaArrowLeft className="text-[10px]" />
              <span>Return to Kiosk</span>
            </button>
          </div>
        )}

        <header className="border-b pb-4">
          <span className="text-xs font-semibold tracking-wider text-teal-600 uppercase">
            Module B • Prescriptions, Lab Reports, Entity Extraction & Timeline
          </span>
          <h1 className="text-3xl font-bold text-slate-800">Document Digitization & OCR</h1>
        </header>

        {ocrError && (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-200 text-sm">
            {ocrError}
          </div>
        )}

        {devangStatus.success && (
          <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-sm flex items-center gap-2">
            <FaCheckCircle className="text-emerald-600 shrink-0 text-base" />
            <span>
              Document successfully analyzed by AI and synced with patient clinical record.
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Control Panel */}
          <div className="space-y-6">
            <UploadPanel
              onFileUpload={handleFileUpload}
              isProcessing={isAnyProcessing}
              docType={docType}
              onDocTypeChange={setDocType}
            />
            <DocumentTimeline
              activeDoc={activeDocument}
              devangStatus={devangStatus}
              history={processedHistory}
            />
          </div>

          {/* Right Output Panel */}
          <div className="lg:col-span-2 space-y-6">
            <EntityExtractionTable entities={extractedEntities} isProcessing={isOcrProcessing} />
            <OcrResultViewer rawLines={rawTextLines} />
          </div>
        </div>
      </main>
    </div>
  );
}