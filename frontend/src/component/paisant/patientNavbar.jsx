import { FaHospital, FaAmbulance, FaClock, FaHeartbeat } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function PatientNavbar({
  topBarTag = "Patient Dashboard"
}) {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const patientName = user.name || "Patient";

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

 const handleStartConsultation = () => {
  const currentPatientId =
    localStorage.getItem("hmsPatientId") ||
    user.patientId ||
    null;

  const appointment = JSON.parse(
    localStorage.getItem("activeAppointment") || "null"
  );

  const today = new Date().toISOString().split("T")[0];
  const appointmentDate = appointment?.date
    ? new Date(appointment.date).toISOString().split("T")[0]
    : null;

  if (
    !appointment ||
    appointment.status !== "confirmed" ||
    appointmentDate !== today
  ) {
    alert(
      "Please book an appointment for today before starting your consultation."
    );
    return;
  }

  navigate("/kiosk", {
    state: {
      patientId: currentPatientId,
      appointmentId: appointment.appointmentId
    }
  });
};

  return (
    <header className="w-full z-40 sticky top-0">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Lora:ital,wght@0,600;1,500&display=swap');

        * {
          font-family: 'Nunito', sans-serif;
        }

        .font-display {
          font-family: 'Lora', serif;
        }

        .teal-grad {
          background: linear-gradient(135deg, #0d9488, #14b8a6, #2dd4bf);
        }
      `}</style>

      {/* Emergency Info Top Bar */}
      <div className="bg-teal-700 text-white text-xs py-2 px-6 flex justify-between items-center font-semibold">
        <span className="flex items-center gap-2">
          <FaAmbulance className="text-sm" />
          24/7 Emergency: <strong>+91 98765 43210</strong>
        </span>

        <span className="hidden sm:inline text-teal-200">|</span>

        <span className="hidden sm:flex items-center gap-2">
          <FaClock className="text-xs" />
          OPD Hours: Mon–Sat, 8AM – 8PM
        </span>

        <span className="text-teal-200 font-bold uppercase tracking-wider text-xs">
          {topBarTag}
        </span>
      </div>

      {/* Main Navigation */}
      <nav className="bg-white border-b border-teal-100 shadow-sm px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center gap-6">

          {/* Hospital Branding + Patient Portal */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-2xl teal-grad flex items-center justify-center text-white shadow-md shadow-teal-300/40">
              <FaHospital className="text-xl" />
            </div>

            <div>
              <div className="font-black text-slate-800 text-base leading-tight">
                MultiSpecialist
              </div>

              <div className="text-xs text-teal-600 font-semibold tracking-wider leading-tight">
                HOSPITAL
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-3">

            {/* Start Consultation */}
            <button
              onClick={handleStartConsultation}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm transition-all hover:scale-[1.02]"
            >
              <FaHeartbeat />
              Start Consultation
            </button>

            <button
              onClick={() => {
                document
                  .getElementById("appointments")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              className="px-4 py-2 text-slate-700 hover:text-teal-700 font-bold transition-colors"
            >
              Appointments
            </button>

            <button
              onClick={() => {
                document
                  .getElementById("records")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              className="px-4 py-2 text-slate-700 hover:text-teal-700 font-bold transition-colors"
            >
              Records
            </button>

          </div>

          {/* Welcome + Logout */}
          <div className="flex items-center gap-4 shrink-0">

            <span className="hidden lg:block text-sm text-slate-600 font-semibold">
              Welcome, {patientName}
            </span>

            <button
              onClick={handleLogout}
              className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-lg font-bold transition-colors"
            >
              Logout
            </button>

          </div>

        </div>
      </nav>
    </header>
  );
}