import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaHospital, FaEnvelope, FaLock, FaUserMd, FaUserInjured, FaUserShield,
  FaEye, FaEyeSlash, FaArrowRight, FaCheckCircle, FaHeartbeat
} from "react-icons/fa";

export default function Signup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("patient");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:8080/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role: "patient" })
      });
      const data = await response.json();
      if (response.ok) {
        // Send welcome email after successful registration
        try {
          const emailResponse = await fetch("http://localhost:8080/api/auth/send-test-email/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, name })
          });
          const emailData = await emailResponse.json();
          console.log("Email API Response:", emailData.message);
        } catch (emailErr) {
          console.warn("Welcome email failed (non-blocking):", emailErr);
        }
        alert(data.message);
        navigate("/login");
      } else {
        alert(data.message || "Signup failed");
      }
    } catch (error) {
      console.error("Error during signup:", error);
      alert("An error occurred during signup");
    }
  };

  // const roles = [
  //   { value: "patient", label: "Patient", icon: <FaUserInjured />, desc: "Book appointments & manage health records" },
  //   { value: "doctor", label: "Doctor", icon: <FaUserMd />, desc: "Manage consultations & patient care" },
  //   { value: "admin", label: "Admin", icon: <FaUserShield />, desc: "Hospital operations & management" },
  // ];

  return (
    <div className="min-h-screen flex font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Lora:ital,wght@0,600;1,500&display=swap');
        * { font-family: 'Nunito', sans-serif; }
        .font-display { font-family: 'Lora', serif; }
        .teal-grad { background: linear-gradient(135deg, #0d9488, #14b8a6, #2dd4bf); }
        .teal-grad-text { background: linear-gradient(135deg, #0d9488, #14b8a6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .input-focus:focus { outline: none; border-color: #14b8a6; box-shadow: 0 0 0 3px rgba(20,184,166,0.15); }
        .role-card { transition: all 0.2s ease; cursor: pointer; }
        .role-card:hover { transform: translateY(-2px); }
        .role-card.active { border-color: #14b8a6; background: #f0fdfa; box-shadow: 0 0 0 3px rgba(20,184,166,0.15); }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        .fade-up { animation: fadeUp 0.7s ease-out both; }
        .fade-up-1 { animation: fadeUp 0.7s ease-out 0.1s both; }
        .fade-up-2 { animation: fadeUp 0.7s ease-out 0.2s both; }
        .float-anim { animation: float 5s ease-in-out infinite; }
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
            Join Our<br />Care Network
          </h2>
          <p className="text-teal-100 text-base text-center leading-relaxed max-w-xs mx-auto">
            Access world-class multispecialty care, book appointments, and manage your health — all in one place.
          </p>

          <div className="mt-10 space-y-3">
            {["NABH Accredited Hospital", "120+ Specialist Doctors", "24/7 Emergency Care", "Online & In-Person Consultations"].map(item => (
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
              Create your <span className="teal-grad-text">account</span>
            </h1>
            <p className="text-slate-400 text-sm">Sign up to access personalized healthcare services.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Full Name */}
            <div className="fade-up-1">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Full Name</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" /></svg>
                </span>
                <input
                  type="text"
                  placeholder="Dr. John Doe / Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="input-focus w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-slate-200 bg-white text-slate-800 text-sm font-semibold placeholder:text-slate-300 transition-all"
                />
              </div>
            </div>

            {/* Email */}
            <div className="fade-up-1">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Email Address</label>
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
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Password</label>
              <div className="relative">
                <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-400 text-sm" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="input-focus w-full pl-11 pr-12 py-3.5 rounded-xl border-2 border-slate-200 bg-white text-slate-800 text-sm font-semibold placeholder:text-slate-300 transition-all"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-500 transition-colors">
                  {showPassword ? <FaEyeSlash className="text-sm" /> : <FaEye className="text-sm" />}
                </button>
              </div>
            </div>

            {/* Role selector */}
            {/* <div className="fade-up-2">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">I am registering as</label>
              <div className="grid grid-cols-3 gap-3">
                {roles.map(({ value, label, icon, desc }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRole(value)}
                    className={`role-card border-2 rounded-2xl p-3 text-center ${role === value ? "active" : "border-slate-200 bg-white hover:border-teal-200"}`}
                  >
                    <div className={`text-2xl mx-auto mb-1.5 ${role === value ? "text-teal-600" : "text-slate-400"}`}>{icon}</div>
                    <div className={`text-xs font-black ${role === value ? "text-teal-700" : "text-slate-600"}`}>{label}</div>
                    <div className="text-[10px] text-slate-400 font-medium mt-0.5 leading-tight hidden sm:block">{desc}</div>
                  </button>
                ))}
              </div>
            </div> */}

            {/* Terms */}
            <div className="fade-up-2 flex items-start gap-3">
              <button
                type="button"
                onClick={() => setAgreed(!agreed)}
                className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${agreed ? "bg-teal-500 border-teal-500" : "border-slate-300 bg-white"}`}
              >
                {agreed && <FaCheckCircle className="text-white text-xs" />}
              </button>
              <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                I agree to the <span className="text-teal-600 cursor-pointer hover:underline">Terms of Service</span> and <span className="text-teal-600 cursor-pointer hover:underline">Privacy Policy</span> of Medikiosk.
              </p>
            </div>

            {/* Submit */}
            <div className="fade-up-2 pt-1">
              <button
                type="submit"
                className="group w-full py-4 teal-grad text-white font-black rounded-2xl shadow-lg shadow-teal-300/40 hover:opacity-90 hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2 text-base"
              >
                Create Account
                <FaArrowRight className="text-sm group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="fade-up-2 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => navigate("/login")}
                className="py-3 border-2 border-teal-200 text-teal-700 font-bold rounded-xl hover:bg-teal-50 transition-all text-sm">
                Already have an account? Login
              </button>
              <button type="button" onClick={() => navigate("/")}
                className="py-3 border-2 border-slate-200 text-slate-500 font-bold rounded-xl hover:bg-slate-50 transition-all text-sm">
                ← Back to Home
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}