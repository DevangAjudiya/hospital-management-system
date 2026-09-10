import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaHospital, FaEnvelope, FaLock, FaEye, FaEyeSlash,
  FaArrowRight, FaHeartbeat, FaCheckCircle, FaUserMd
} from "react-icons/fa";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8080/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        const role = data.user.role;
        if (role === "doctor") navigate("/doctor-dashboard");
        else if (role === "patient") navigate("/patient-dashboard");
        else if (role === "admin") navigate("/admin-dashboard");
        else if (role === "receptionist") navigate("/receptionist-dashboard");
        else if (role === "pharmacist") navigate("/pharmacist-dashboard");
        else if (role === "lab_staff") navigate("/lab_staff-dashboard");
        else navigate("/");
      } else {
        alert(data.message || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("An error occurred during login. Please try again.");
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
            Welcome<br />Back
          </h2>
          <p className="text-teal-100 text-base text-center leading-relaxed max-w-xs mx-auto">
            Sign in to access your personalized dashboard, appointments, and health records.
          </p>

          <div className="mt-10 space-y-3">
            {[
              "Secure & Encrypted Login",
              "Access All Your Records",
              "Manage Appointments",
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
              Sign in to your <span className="teal-grad-text">account</span>
            </h1>
            <p className="text-slate-400 text-sm">Enter your credentials to access your dashboard.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

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

            {/* Password */}
            <div className="fade-up-1">
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  className="text-xs text-teal-600 font-bold hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-400 text-sm" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="input-focus w-full pl-11 pr-12 py-3.5 rounded-xl border-2 border-slate-200 bg-white text-slate-800 text-sm font-semibold placeholder:text-slate-300 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-500 transition-colors"
                >
                  {showPassword ? <FaEyeSlash className="text-sm" /> : <FaEye className="text-sm" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <div className="fade-up-2 pt-1">
              <button
                type="submit"
                className={`group w-full py-4 teal-grad text-white font-black rounded-2xl shadow-lg shadow-teal-300/40 hover:opacity-90 hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2 text-base ${loading ? "btn-loading" : ""}`}
              >
                {loading ? "Signing in…" : "Sign In"}
                {!loading && <FaArrowRight className="text-sm group-hover:translate-x-1 transition-transform" />}
              </button>
            </div>

            <div className="fade-up-2 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => navigate("/signup")}
                className="py-3 border-2 border-teal-200 text-teal-700 font-bold rounded-xl hover:bg-teal-50 transition-all text-sm"
              >
                Create an account
              </button>
              <button
                type="button"
                onClick={() => navigate("/")}
                className="py-3 border-2 border-slate-200 text-slate-500 font-bold rounded-xl hover:bg-slate-50 transition-all text-sm"
              >
                ← Back to Home
              </button>
            </div>

          </form>

          {/* Role hint */}
          <div className="fade-up-2 mt-8 p-4 bg-teal-50 border border-teal-100 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <FaUserMd className="text-teal-500 text-sm" />
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Role-Based Access</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              After login you'll be redirected to your role-specific dashboard — Doctor, Patient, Admin, Receptionist, Pharmacist, or Lab Staff.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
