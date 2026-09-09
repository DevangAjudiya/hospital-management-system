import './App.css';
import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './component/auth/ProtectedRoute';
import HospitalHomepage from './component/utils/HospitalHomepage';
import Login from './component/auth/Login';
import Signup from './component/auth/Signup';
import ForgotPass from './component/auth/ForgotPass';
import ResetPass from './component/auth/ResetPass';
import Doctor_Des from './component/doctor/Doctor_Des';
import PatientDashboard from './component/paisant/PatientDashboard';
import AdminDashboard from './component/admin/AdminDashboard';
import ReceptionistDashboard from './component/receptionist/ReceptionistDashboard';
import PharmacyDashboard from './component/pharmacy/PharmacyDashboard';
import LabDashboard from './component/lab/LabDashboard';
import DocumentDigitizationPage from './features/document-digitization';
import KioskHome from './features/kiosk/KioskHome';
import KioskInterview from './features/kiosk/pages/KioskInterview';
import KioskConsentPage from './features/kiosk/pages/KioskConsentPage';
import TriageAlertScreen from './features/triage/TriageAlertScreen';
const SummaryReviewPage = React.lazy(() =>
  import('./features/summary-generator/pages/SummaryReviewPage')
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HospitalHomepage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPass />} />
        <Route path="/reset-password" element={<ResetPass />} />
        <Route path="/doctor-dashboard" element={<Doctor_Des />} />
        <Route path="/patient-dashboard" element={<PatientDashboard />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/receptionist-dashboard" element={<ReceptionistDashboard />} />
        <Route path="/pharmacist-dashboard" element={<PharmacyDashboard />} />
        <Route path="/lab_staff-dashboard" element={<LabDashboard />} />
        <Route path="/document-digitization" element={<ProtectedRoute><DocumentDigitizationPage /></ProtectedRoute>} />
        <Route
          path="/kiosk"
          element={
            <ProtectedRoute>
              <KioskHome />
            </ProtectedRoute>
          }
        />
        {/* D3: Consent gate — must be passed before any A/B/C clinical session */}
        <Route
          path="/kiosk/consent"
          element={
            <ProtectedRoute>
              <KioskConsentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/kiosk/interview"
          element={
            <ProtectedRoute>
              <KioskInterview />
            </ProtectedRoute>
          }
        />
        <Route path="/triage" element={<TriageAlertScreen />} />
        <Route path="/summary-review" element={
          <ProtectedRoute>
          <Suspense fallback={<div>Loading...</div>}>
            <SummaryReviewPage />
          </Suspense>
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App;
