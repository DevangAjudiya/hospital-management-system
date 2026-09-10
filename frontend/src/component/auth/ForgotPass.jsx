import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaHospital, FaEnvelope, FaArrowRight, FaHeartbeat, FaCheckCircle } from "react-icons/fa";

export default function ForgotPass() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: "", message: "" });
    try {
      const response = await fetch("http://localhost:8080/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (response.ok) {
        setStatus({ type: "success", message: data.message || "OTP sent successfully!" });
        // After sending OTP, redirect to the reset page and pass email
        setTimeout(() => navigate("/reset-password", { state: { email } }), 1500);
      } else {
        setStatus({ type: "error", message: data.message || "Failed to send reset link." });
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      setStatus({ type: "error", message: "An error occurred. Please try again later." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Lora:ital,wght@0,600;1,500&display=swap');
        * { font-family: 'Nunito', sans-serif; }
        .font-display { font-family: 'Lora', serif; }
        .teal-grad { background: linear-gradient(135deg, #0d9488, #14b8a6, #2dd4bf); }
        .teal-grad-text { background: linear-gradient(135deg, #0d9488, #14b8a6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .input-focus:focus { outline: none; border-color: #14b8a6; box-shadow: 0 0 0 3px rgba(20,184,166,0.15); }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        .fade-up { animation: fadeUp 0.7s ease-out both; }
        .fade-up-1 { animation: fadeUp 0.7s ease-out 0.1s both; }
        .fade-up-2 { animation: fadeUp 0.7s ease-out 0.2s both; }
        .float-anim { animation: float 5s ease-in-out infinite; }
        .btn-loading { opacity: 0.75; pointer-events: none; }
      `}</style>

      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex lg:w-5/12 teal-grad relative flex-col justify-between p-12 overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-[-80px] right-[-80px] w-72 h-72 rounded-full bg-white/10" />
        <div className="absolute bottom-[-60px] left-[-60px] w-56 h-56 rounded-full bg-white/10" />
        <div className="absolute top-1/2 right-[-40px] w-32 h-32 rounded-full bg-emerald-300/20" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center border border-white/30">
            <FaHospital className="text-white text-xl" />
          </div>
          <div>
            <div className="font-black text-white text-lg leading-tight">Medikiosk</div>
          </div>
        </div>

        {/* Center content */}
        <div className="relative z-10 float-anim">
          <div className="w-28 h-28 rounded-3xl bg-white/15 backdrop-blur border border-white/20 flex items-center justify-center mb-8 mx-auto shadow-2xl">
            <FaHeartbeat className="text-white text-5xl" />
          </div>
          <h2 className="font-display text-4xl font-bold text-white mb-4 leading-snug text-center">
            Reset Your<br />Password
          </h2>
          <p className="text-teal-100 text-base text-center leading-relaxed max-w-xs mx-auto">
            Don't worry, it happens to the best of us. We'll send you a secure 6-digit OTP to reset your password.
          </p>

          <div className="mt-10 space-y-3">
            {[
              "Secure OTP Verification",
              "15-Minute Expiration",
              "Encrypted Connection",
              "24/7 Online Support",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm text-white/85 font-semibold">
                <FaCheckCircle className="text-emerald-300 flex-shrink-0" /> {item}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom note */}
        <div className="relative z-10 text-xs text-teal-100/70 text-center">
          © 2026 Medikiosk · All Rights Reserved
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-teal-50/30 px-6 py-12 overflow-y-auto">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <div className="w-9 h-9 rounded-xl teal-grad flex items-center justify-center shadow-md">
              <FaHospital className="text-white" />
            </div>
            <div>
              <div className="font-black text-slate-800 text-base leading-tight">Medikiosk</div>
            </div>
          </div>

          <div className="fade-up mb-8">
            <h1 className="font-display text-3xl font-bold text-slate-800 mb-2">
              Forgot <span className="teal-grad-text">Password?</span>
            </h1>
            <p className="text-slate-400 text-sm">Enter the email associated with your account.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {status.message && (
              <div className={`fade-up p-4 rounded-xl text-sm font-bold border ${status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                {status.message}
              </div>
            )}

            {/* Email */}
            <div className="fade-up-1">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-400 text-sm" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="input-focus w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-slate-200 bg-white text-slate-800 text-sm font-semibold placeholder:text-slate-300 transition-all"
                />
              </div>
            </div>

            {/* Submit */}
            <div className="fade-up-2 pt-1">
              <button
                type="submit"
                className={`group w-full py-4 teal-grad text-white font-black rounded-2xl shadow-lg shadow-teal-300/40 hover:opacity-90 hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2 text-base ${loading ? "btn-loading" : ""}`}
              >
                {loading ? "Sending..." : "Send OTP"}
                {!loading && <FaArrowRight className="text-sm group-hover:translate-x-1 transition-transform" />}
              </button>
            </div>

            <div className="fade-up-2 text-center pt-2">
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="text-teal-600 font-bold hover:underline transition-all text-sm"
              >
                Remembered your password? Login
              </button>
            </div>

          </form>

        </div>
      </div>
    </div>
  );
}