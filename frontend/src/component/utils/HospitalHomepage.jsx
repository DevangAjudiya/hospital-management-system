import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaHospital, FaHome, FaInfoCircle, FaConciergeBell, FaUserPlus, FaSignInAlt,
  FaHeartbeat, FaShieldAlt, FaUserMd, FaAmbulance, FaMicroscope, FaBaby,
  FaBrain, FaBone, FaEye, FaPhoneAlt, FaEnvelope, FaBars, FaTimes,
  FaStar, FaQuoteLeft, FaCalendarCheck, FaArrowRight, FaMapMarkerAlt,
  FaClock, FaCheckCircle
} from "react-icons/fa";
import { MdLocalHospital, MdEmergency } from "react-icons/md";

const HospitalHomepage = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTestimonial(prev => (prev + 1) % testimonials.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const departments = [
    { icon: <FaHeartbeat />, title: "Cardiology", desc: "Advanced heart care with state-of-the-art cardiac diagnostics and intervention.", color: "text-rose-500", bg: "bg-rose-50", border: "border-rose-100" },
    { icon: <FaBrain />, title: "Neurology", desc: "Comprehensive brain & spine care by expert neurologists.", color: "text-violet-500", bg: "bg-violet-50", border: "border-violet-100" },
    { icon: <FaBone />, title: "Orthopedics", desc: "Joint replacement, sports injuries & bone care specialists.", color: "text-amber-500", bg: "bg-amber-50", border: "border-amber-100" },
    { icon: <FaBaby />, title: "Pediatrics", desc: "Gentle, comprehensive care for infants, children & adolescents.", color: "text-sky-500", bg: "bg-sky-50", border: "border-sky-100" },
    { icon: <FaEye />, title: "Ophthalmology", desc: "Complete eye care — from routine exams to complex surgeries.", color: "text-teal-500", bg: "bg-teal-50", border: "border-teal-100" },
    { icon: <FaMicroscope />, title: "Oncology", desc: "Advanced cancer diagnostics, treatment & supportive care.", color: "text-emerald-500", bg: "bg-emerald-50", border: "border-emerald-100" },
  ];

  const doctors = [
    { name: "Dr. Arjun Mehta", role: "Chief Cardiologist", exp: "18 yrs exp", img: "https://randomuser.me/api/portraits/men/32.jpg", rating: "4.9" },
    { name: "Dr. Priya Sharma", role: "Senior Neurologist", exp: "14 yrs exp", img: "https://randomuser.me/api/portraits/women/44.jpg", rating: "4.8" },
    { name: "Dr. Rohan Desai", role: "Orthopedic Surgeon", exp: "20 yrs exp", img: "https://randomuser.me/api/portraits/men/52.jpg", rating: "4.9" },
    { name: "Dr. Sneha Patel", role: "Pediatric Specialist", exp: "11 yrs exp", img: "https://randomuser.me/api/portraits/women/68.jpg", rating: "4.7" },
  ];

  const testimonials = [
    { name: "Ravi Kapoor", location: "Surat, Gujarat", text: "The doctors here are incredibly attentive. My father's cardiac surgery was handled with the utmost care and professionalism. We couldn't be more grateful.", rating: 5 },
    { name: "Anjali Singh", location: "Vadodara, Gujarat", text: "Outstanding pediatric care for my son. The staff made him feel at ease immediately. Clean facilities and prompt service — highly recommend!", rating: 5 },
    { name: "Meena Joshi", location: "Ahmedabad, Gujarat", text: "After years of back pain, Dr. Desai's orthopedic treatment changed my life. World-class care right here in our city.", rating: 5 },
  ];

  const stats = [
    { val: "25+", label: "Years of Excellence" },
    { val: "120+", label: "Specialist Doctors" },
    { val: "50K+", label: "Patients Served" },
    { val: "40+", label: "Departments" },
  ];

  const navLinks = [
    { icon: <FaHome />, label: "Home" },
    { icon: <FaInfoCircle />, label: "About" },
    { icon: <FaConciergeBell />, label: "Services" },
    { icon: <FaUserMd />, label: "Doctors" },
  ];

  return (
    <div className="font-sans text-slate-800 bg-white overflow-x-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Lora:ital,wght@0,600;1,500&display=swap');

        * { font-family: 'Nunito', sans-serif; }
        .font-display { font-family: 'Lora', serif; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(36px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.9); opacity: 0.7; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .fade-up { animation: fadeUp 0.9s ease-out both; }
        .fade-up-1 { animation: fadeUp 0.9s ease-out 0.15s both; }
        .fade-up-2 { animation: fadeUp 0.9s ease-out 0.3s both; }
        .fade-up-3 { animation: fadeUp 0.9s ease-out 0.45s both; }
        .float-anim { animation: float 4s ease-in-out infinite; }
        .pulse-ring::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: rgba(20,184,166,0.4);
          animation: pulse-ring 2s ease-out infinite;
        }
        .teal-grad { background: linear-gradient(135deg, #0d9488, #14b8a6, #2dd4bf); }
        .teal-grad-soft { background: linear-gradient(135deg, #f0fdfa, #ccfbf1, #e0f2fe); }
        .card-hover { transition: all 0.3s cubic-bezier(0.4,0,0.2,1); }
        .card-hover:hover { transform: translateY(-8px); box-shadow: 0 20px 40px rgba(20,184,166,0.15); }
        .testimonial-slide { animation: slideIn 0.5s ease-out both; }
        .emergency-bar { background: linear-gradient(90deg, #0f766e, #0d9488, #14b8a6, #0d9488, #0f766e); background-size: 200%; animation: shimmer 3s linear infinite; }
        @keyframes shimmer { 0% { background-position: 0% } 100% { background-position: 200% } }
      `}</style>

      {/* ══ EMERGENCY BAR ══ */}
      <div className="emergency-bar text-white text-xs py-2 px-6 flex justify-center items-center gap-6 font-semibold tracking-wide">
        <span className="flex items-center gap-2"><FaAmbulance className="text-sm" /> 24/7 Emergency: <strong>+91 98765 43210</strong></span>
        <span className="hidden sm:inline text-teal-200">|</span>
        <span className="hidden sm:flex items-center gap-2"><FaClock className="text-xs" /> OPD Hours: Mon–Sat, 8AM – 8PM</span>
      </div>

      {/* ══ NAVBAR ══ */}
      <nav className={`sticky top-0 w-full z-50 transition-all duration-300 ${scrolled ? "bg-white/97 shadow-lg shadow-teal-100/50 backdrop-blur-md" : "bg-white border-b border-teal-100"}`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl teal-grad flex items-center justify-center shadow-md shadow-teal-300/40">
              <FaHospital className="text-white text-lg" />
            </div>
            <div>
              <div className="font-black text-slate-800 text-base leading-tight">Medikiosk</div>
            </div>
          </div>

          <ul className="hidden md:flex items-center gap-1">
            {navLinks.map((link, i) => (
              <li key={i}>
                <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-slate-500 hover:text-teal-600 hover:bg-teal-50 transition-all">
                  {link.icon} {link.label}
                </button>
              </li>
            ))}
            <li className="ml-2">
              <button className="flex items-center gap-2 px-5 py-2.5 teal-grad text-white text-sm font-bold rounded-xl shadow-md shadow-teal-300/40 hover:opacity-90 transition-all hover:scale-105"
                onClick={() => navigate("/login")}>
                <FaCalendarCheck /> Book Appointment
              </button>
            </li>
            <li>
              <button className="flex items-center gap-1.5 px-4 py-2.5 border-2 border-teal-200 text-teal-700 text-sm font-bold rounded-xl hover:bg-teal-50 transition-all ml-1"
                onClick={() => navigate("/login")}>
                <FaSignInAlt /> Login
              </button>
            </li>
          </ul>

          <button className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-teal-50" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden bg-white border-t border-teal-100 px-4 py-3 flex flex-col gap-1">
            {navLinks.map((link, i) => (
              <button key={i} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-teal-50 hover:text-teal-700 transition text-left">
                {link.icon} {link.label}
              </button>
            ))}
            <button className="mt-2 w-full py-3 teal-grad text-white font-bold rounded-xl text-sm">Book Appointment</button>
          </div>
        )}
      </nav>

      {/* ══ HERO ══ */}
      <section
        className="min-h-screen flex items-center text-white bg-cover bg-center relative overflow-hidden"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1600')" }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-teal-900/90 via-teal-800/75 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {/* Floating decorative shapes */}
        <div className="absolute top-24 right-24 w-64 h-64 rounded-full bg-teal-400/10 border border-teal-400/20 float-anim hidden lg:block" />
        <div className="absolute top-40 right-40 w-40 h-40 rounded-full bg-emerald-400/10 border border-emerald-400/20 float-anim hidden lg:block" style={{ animationDelay: "1.5s" }} />

        <div className="relative z-10 px-6 max-w-7xl mx-auto w-full py-24">
          <div className="max-w-2xl">
            <div className="fade-up inline-flex items-center gap-2 bg-teal-400/20 backdrop-blur-sm border border-teal-300/30 text-teal-200 text-xs font-bold px-4 py-2 rounded-full mb-8 tracking-wide">
              <span className="relative w-2 h-2 pulse-ring">
                <span className="block w-2 h-2 rounded-full bg-emerald-400" />
              </span>
              &nbsp; NABH Accredited · ISO 9001:2015 Certified
            </div>

            <h1 className="fade-up-1 font-display text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              Your Health,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-emerald-300">
                Our Purpose.
              </span>
            </h1>

            <p className="fade-up-2 text-lg md:text-xl text-white/75 mb-10 leading-relaxed max-w-lg">
              World-class multispecialty care under one roof — compassionate doctors, advanced technology, and a healing environment built for you.
            </p>

            <div className="fade-up-3 flex flex-col sm:flex-row flex-wrap gap-4">
              <button className="group flex items-center justify-center gap-2.5 px-8 py-4 teal-grad text-white font-black rounded-2xl shadow-xl shadow-teal-600/40 hover:scale-105 transition-all duration-200 text-base cursor-pointer"
                onClick={() => navigate("/login")}>
                <FaCalendarCheck /> Book Appointment
                <FaArrowRight className="text-sm group-hover:translate-x-1 transition-transform" />
              </button>

              <button className="flex items-center justify-center gap-2.5 px-8 py-4 bg-white/15 backdrop-blur-sm border-2 border-white/30 text-white font-bold rounded-2xl hover:bg-white/25 transition-all text-base">
                <FaPhoneAlt className="text-teal-300" /> Emergency: 108
              </button>
            </div>

            {/* Highlights */}
            <div className="fade-up-3 mt-12 flex flex-wrap gap-4">
              {["Free OPD on Weekends", "Insurance Accepted", "Online Consultation"].map(tag => (
                <div key={tag} className="flex items-center gap-2 text-sm text-white/80 font-semibold">
                  <FaCheckCircle className="text-emerald-400 text-xs" /> {tag}
                </div>
              ))}
            </div>
          </div>

          {/* Stats row */}
          <div className="fade-up-3 mt-20 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl">
            {stats.map(({ val, label }) => (
              <div key={label} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-5 py-4 text-center">
                <div className="text-2xl font-black text-teal-300">{val}</div>
                <div className="text-xs text-white/60 font-semibold mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ ABOUT ══ */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <div className="w-full lg:w-1/2 relative">
            <img
              src="https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=800"
              alt="Hospital"
              className="w-full rounded-3xl shadow-2xl object-cover h-[420px]"
            />
            <div className="absolute -bottom-5 -right-5 bg-white rounded-2xl border border-teal-100 shadow-xl px-5 py-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl teal-grad flex items-center justify-center shadow-md">
                <FaShieldAlt className="text-white" />
              </div>
              <div>
                <div className="text-sm font-black text-slate-700">NABH Accredited</div>
                <div className="text-xs text-slate-400">Highest quality standards</div>
              </div>
            </div>
            <div className="absolute -top-5 -left-5 bg-teal-500 text-white rounded-2xl shadow-xl px-5 py-4 text-center">
              <div className="text-2xl font-black">25+</div>
              <div className="text-xs font-semibold opacity-80">Years of Trust</div>
            </div>
          </div>

          <div className="flex-1">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-full mb-5">
              About Us
            </span>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-slate-800 mb-6 leading-tight">
              Healing With <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-emerald-500">Heart & Science</span>
            </h2>
            <p className="text-slate-500 leading-relaxed mb-4">
              Medikiosk has been a cornerstone of healthcare in our community for over 25 years. We combine cutting-edge medical technology with genuine compassion to deliver exceptional patient outcomes.
            </p>
            <p className="text-slate-500 leading-relaxed mb-8">
              Our 120+ specialist doctors across 40+ departments work in a fully integrated care model — ensuring every patient receives precise diagnosis, effective treatment, and warm support throughout their healing journey.
            </p>

            <div className="grid grid-cols-2 gap-3">
              {[["🏥", "40+ Departments"], ["👨‍⚕️", "120+ Specialists"], ["🔬", "Advanced Diagnostics"], ["❤️", "Patient-First Care"]].map(([e, l]) => (
                <div key={l} className="flex items-center gap-2.5 bg-teal-50 border border-teal-100 rounded-xl px-4 py-3">
                  <span className="text-lg">{e}</span>
                  <span className="text-sm font-bold text-slate-700">{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ DEPARTMENTS ══ */}
      <section className="py-24 teal-grad-soft">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-teal-700 bg-white border border-teal-200 px-3 py-1.5 rounded-full mb-5">
            Departments
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-slate-800 mb-4">Our Specialties</h2>
          <p className="text-slate-400 mb-14 max-w-xl mx-auto text-base">Expert care across every major medical discipline — all under one roof.</p>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {departments.map((dept, i) => (
              <div key={i} className={`${dept.bg} border ${dept.border} p-6 rounded-2xl card-hover text-left cursor-pointer group`}>
                <div className={`text-4xl ${dept.color} mb-4 group-hover:scale-110 transition-transform duration-200`}>{dept.icon}</div>
                <h3 className="font-bold text-slate-800 mb-2 text-base">{dept.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-4">{dept.desc}</p>
                <span className={`text-xs font-bold ${dept.color} flex items-center gap-1 group-hover:gap-2 transition-all`}>
                  Learn More <FaArrowRight className="text-xs" />
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ APPOINTMENT CTA ══ */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="teal-grad rounded-3xl p-10 md:p-14 shadow-2xl shadow-teal-300/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/2" />
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
              <div className="flex-1 text-white">
                <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Book Your Appointment Today</h2>
                <p className="text-white/75 text-base mb-6 max-w-md">
                  Schedule a consultation with our specialists in minutes. Same-day appointments available for urgent cases.
                </p>
                <div className="flex flex-wrap gap-4 text-sm text-white/80 font-semibold">
                  <span className="flex items-center gap-2"><FaCheckCircle className="text-emerald-300" /> No Long Wait Times</span>
                  <span className="flex items-center gap-2"><FaCheckCircle className="text-emerald-300" /> Online & In-Person</span>
                  <span className="flex items-center gap-2"><FaCheckCircle className="text-emerald-300" /> All Insurances</span>
                </div>
              </div>
              <div className="flex flex-col gap-3 w-full md:w-auto">
                <button className="flex items-center justify-center gap-2.5 px-8 py-4 bg-white text-teal-700 font-black rounded-2xl shadow-lg hover:bg-teal-50 transition-all hover:scale-105 whitespace-nowrap"
                  onClick={() => navigate("/login")}>
                  <FaCalendarCheck /> Book Appointment →
                </button>
                <button className="flex items-center justify-center gap-2 px-8 py-3.5 bg-white/20 border-2 border-white/40 text-white font-bold rounded-2xl hover:bg-white/30 transition-all whitespace-nowrap">
                  <FaPhoneAlt /> Call Us Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ DOCTORS ══ */}
      <section className="py-24 px-6 teal-grad-soft">
        <div className="max-w-7xl mx-auto text-center">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-teal-700 bg-white border border-teal-200 px-3 py-1.5 rounded-full mb-5">
            Our Team
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-slate-800 mb-4">Meet Our Doctors</h2>
          <p className="text-slate-400 mb-14 max-w-xl mx-auto">Experienced specialists dedicated to delivering the finest medical care.</p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {doctors.map((doc, i) => (
              <div key={i} className="bg-white border border-slate-100 rounded-3xl p-6 card-hover shadow-sm text-center group">
                <div className="relative inline-block mb-4">
                  <img src={doc.img} alt={doc.name} className="w-24 h-24 rounded-2xl object-cover border-4 border-teal-100 mx-auto group-hover:border-teal-300 transition-all" />
                  <div className="absolute -bottom-1.5 -right-1.5 w-5 h-5 bg-emerald-400 rounded-full border-2 border-white" />
                </div>
                <h4 className="font-black text-slate-800 text-base mb-1">{doc.name}</h4>
                <p className="text-xs text-teal-600 font-bold mb-1">{doc.role}</p>
                <p className="text-xs text-slate-400 font-semibold mb-3">{doc.exp}</p>
                <div className="flex items-center justify-center gap-1 mb-4">
                  <FaStar className="text-amber-400 text-xs" />
                  <span className="text-xs font-bold text-slate-600">{doc.rating}</span>
                </div>
                <button className="w-full py-2 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700 text-xs font-bold rounded-xl transition-all">
                  Book Consultation
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ TESTIMONIALS ══ */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-full mb-5">
            Patient Stories
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-slate-800 mb-4">What Our Patients Say</h2>
          <p className="text-slate-400 mb-14">Real stories from patients who trusted us with their health.</p>

          <div className="relative bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-100 rounded-3xl p-10 shadow-lg min-h-[220px] flex flex-col justify-center">
            <FaQuoteLeft className="text-teal-200 text-5xl mb-6 mx-auto" />
            <div key={activeTestimonial} className="testimonial-slide">
              <p className="text-slate-600 text-lg leading-relaxed mb-8 max-w-2xl mx-auto italic font-display">
                "{testimonials[activeTestimonial].text}"
              </p>
              <div className="flex items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-400 flex items-center justify-center text-white font-black text-base">
                  {testimonials[activeTestimonial].name[0]}
                </div>
                <div className="text-left">
                  <div className="font-black text-slate-800 text-sm">{testimonials[activeTestimonial].name}</div>
                  <div className="text-xs text-slate-400 flex items-center gap-1">
                    <FaMapMarkerAlt className="text-teal-400 text-xs" /> {testimonials[activeTestimonial].location}
                  </div>
                </div>
                <div className="ml-3 flex gap-0.5">
                  {[...Array(testimonials[activeTestimonial].rating)].map((_, i) => (
                    <FaStar key={i} className="text-amber-400 text-xs" />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-2 mt-6">
            {testimonials.map((_, i) => (
              <button key={i} onClick={() => setActiveTestimonial(i)}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${i === activeTestimonial ? "bg-teal-500 scale-125" : "bg-teal-200"}`} />
            ))}
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="bg-slate-900 text-white py-16 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-10 mb-10">
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl teal-grad flex items-center justify-center">
                <FaHospital className="text-white text-lg" />
              </div>
              <div>
                <div className="font-black text-white text-base leading-tight">Medikiosk</div>
              </div>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              Committed to advancing healthcare with compassion, technology, and trust since 2000.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-black mb-4 text-white uppercase tracking-wider">Departments</h3>
            <div className="space-y-2 text-sm text-slate-400">
              {["Cardiology", "Neurology", "Orthopedics", "Pediatrics", "Oncology"].map(d => (
                <p key={d} className="hover:text-teal-400 cursor-pointer transition">{d}</p>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-black mb-4 text-white uppercase tracking-wider">Quick Links</h3>
            <div className="space-y-2 text-sm text-slate-400">
              {["About Us", "Our Doctors", "Book Appointment", "Patient Login", "Health Blog"].map(l => (
                <p key={l} className="hover:text-teal-400 cursor-pointer transition">{l}</p>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-black mb-4 text-white uppercase tracking-wider">Contact Us</h3>
            <div className="space-y-3 text-sm text-slate-400">
              <p className="flex items-start gap-2"><FaMapMarkerAlt className="text-teal-500 mt-0.5 flex-shrink-0" /> 14, Medical Campus Road, Surat, Gujarat 395007</p>
              <p className="flex items-center gap-2 hover:text-teal-400 transition cursor-pointer"><FaPhoneAlt className="text-teal-500" /> +91 98765 43210</p>
              <p className="flex items-center gap-2 hover:text-teal-400 transition cursor-pointer"><FaEnvelope className="text-teal-500" /> care@multispecialist.in</p>
              <p className="flex items-center gap-2"><FaClock className="text-teal-500" /> OPD: Mon–Sat, 8AM–8PM</p>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-slate-500 text-xs">© 2026 Medikiosk · All Rights Reserved</p>
          <div className="flex gap-4">
            {["Privacy Policy", "Terms of Service", "Support"].map(l => (
              <span key={l} className="text-slate-600 hover:text-teal-400 text-xs cursor-pointer transition">{l}</span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HospitalHomepage;