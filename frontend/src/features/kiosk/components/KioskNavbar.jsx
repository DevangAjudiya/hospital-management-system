import React from 'react';
import { FaHospital, FaAmbulance, FaClock } from 'react-icons/fa';

export default function KioskNavbar({
  topBarTag = 'Patient Consultation',
  rightAction = null
}) {
  return (
    <header className="w-full z-40 sticky top-0">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Lora:ital,wght@0,600;1,500&display=swap');
        * { font-family: 'Nunito', sans-serif; }
        .font-display { font-family: 'Lora', serif; }
        .teal-grad { background: linear-gradient(135deg, #0d9488, #14b8a6, #2dd4bf); }
      `}</style>

      {/* Emergency Info Top Bar */}
      <div className="bg-teal-700 text-white text-xs py-2 px-6 flex justify-between items-center font-semibold">
        <span className="flex items-center gap-2">
          <FaAmbulance className="text-sm" /> 24/7 Emergency: <strong>+91 98765 43210</strong>
        </span>
        <span className="hidden sm:inline text-teal-200">|</span>
        <span className="hidden sm:flex items-center gap-2">
          <FaClock className="text-xs" /> OPD Hours: Mon–Sat, 8AM – 8PM
        </span>
        <span className="text-teal-200 font-bold uppercase tracking-wider text-xs">
          {topBarTag}
        </span>
      </div>

      {/* Hospital Branding Header */}
      <nav className="bg-white border-b border-teal-100 shadow-sm px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl teal-grad flex items-center justify-center text-white shadow-md shadow-teal-300/40">
            <FaHospital className="text-xl" />
          </div>
          <div>
            <div className="font-black text-slate-800 text-base leading-tight">MultiSpecialist</div>
            <div className="text-xs text-teal-600 font-semibold tracking-wider leading-tight">HOSPITAL</div>
          </div>
        </div>

        {rightAction && (
          <div className="flex items-center">
            {rightAction}
          </div>
        )}
      </nav>
    </header>
  );
}
