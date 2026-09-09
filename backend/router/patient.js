const express = require("express");
const patientRouter = express.Router();
const Appointment = require("../models/Appointment.js");
const Consultation = require("../models/Consultation.js");
const LabReport = require("../models/LabReport.js");
const Bill = require("../models/Bill.js");
const Patient = require("../models/Patient.js");
const Doctor = require("../models/doctor.js");
const { authenticate, authorizeRole } = require("../middleware/authMiddleware.js");
const encryptionService = require("../services/crypto/encryptionService");

// All patient endpoints require patient role (some might allow admin/receptionist)
patientRouter.use(authenticate, authorizeRole("patient", "admin", "receptionist"));

// ─── GET ALL DOCTORS (for booking dropdown) ───────────────────────────────────
patientRouter.get("/doctors", async (req, res) => {
    try {
        const { getCache, setCache } = require("../redisClient");
        const cacheKey = "patient:doctors:list";
        const cached = await getCache(cacheKey);
        if (cached) return res.json(cached);

        const doctors = await Doctor.find({}, "name specialization email _id");
        await setCache(cacheKey, doctors, 3600); // 1 hour TTL
        res.json(doctors);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Helper to get patient details from user id
const getPatientId = async (userId) => {
    let patient = await Patient.findOne({ userId });
    if (!patient) {
        // Auto-create patient profile if empty
        patient = new Patient({ userId });
        await patient.save();
    }
    return patient._id;
};

// Helper to normalize date to YYYY-MM-DD
const normalizeDate = (dateInput) => {
    try {
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return null;
        return d.toISOString().split('T')[0];
    } catch (e) {
        return null;
    }
};

// Check Doctor Availability
patientRouter.get("/availability", async (req, res) => {
    const { doctorId, date } = req.query;
    
    const normalizedDate = normalizeDate(date);
    if (!normalizedDate) return res.status(400).json({ message: "Invalid date format" });

    try {
        const { getCache, setCache } = require("../redisClient");
        const cacheKey = `patient:availability:${doctorId}:${normalizedDate}`;
        const cached = await getCache(cacheKey);
        if (cached) return res.json(cached);

        const doc = await Doctor.findById(doctorId);
        if(!doc) return res.status(404).json({message: "Doctor not found"});
        
        // Generate 15 minute interval slots from 09:00 AM to 05:00 PM
        const allSlots = [];
        let startHour = 9;
        let startMin = 0;
        
        while (startHour < 17) {
            let period = startHour >= 12 ? 'PM' : 'AM';
            let formattedHour = startHour > 12 ? startHour - 12 : startHour;
            if (formattedHour === 0) formattedHour = 12;
            let formattedMin = startMin === 0 ? '00' : startMin.toString();
            let hrPrefix = formattedHour < 10 ? '0' : '';
            
            allSlots.push(`${hrPrefix}${formattedHour}:${formattedMin} ${period}`);
            
            startMin += 15;
            if (startMin >= 60) {
                startMin = 0;
                startHour++;
            }
        }

        // Query accurately (book route saves raw new Date(date))
        const booked = await Appointment.find({ doctorId, date: new Date(date), status: { $ne: "cancelled" } });
        const bookedSlots = booked.map(b => b.slot);
        
        const availableSlots = allSlots.filter(s => !bookedSlots.includes(s));
        
        const responseData = { availableSlots };
        await setCache(cacheKey, responseData, 300); // 5 min TTL
        res.json(responseData);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Book Appointment — TEMP: payment check bypassed for testing
patientRouter.post("/book", async (req, res) => {
    const { doctorId, date, slot } = req.body;
    try {
        const patientId = await getPatientId(req.user.id);

        // Check slot availability
        const existing = await Appointment.findOne({
            doctorId, date: new Date(date), slot, status: { $ne: "cancelled" }
        });
        if (existing) return res.status(400).json({ message: "Slot already booked" });

        const appt = new Appointment({
            patientId,
            doctorId,
            date: new Date(date),
            slot,
            status: "confirmed",
        });
        await appt.save();

        const { delCache } = require("../redisClient");
        const normalizedDate = normalizeDate(appt.date);
        if (normalizedDate) {
            await delCache(`patient:availability:${doctorId}:${normalizedDate}`);
        }

        res.status(201).json({ message: "Appointment booked successfully", appointment: appt });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

patientRouter.post("/cancel", async (req, res) => {
    const { appointmentId } = req.body;
    try {
        const appt = await Appointment.findById(appointmentId);
        if (!appt) return res.status(404).json({ message: "Appointment not found" });
        
        appt.status = "cancelled";
        await appt.save();

        const { delCache } = require("../redisClient");
        const normalizedDate = normalizeDate(appt.date);
        if (normalizedDate) {
            await delCache(`patient:availability:${appt.doctorId}:${normalizedDate}`);
        }
        
        res.json({ message: "Appointment cancelled" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

patientRouter.post("/reschedule", async (req, res) => {
    const { appointmentId, newDate, newSlot } = req.body;
    try {
        const appt = await Appointment.findById(appointmentId);
        if (!appt) return res.status(404).json({ message: "Appointment not found" });

        const oldDateNormalized = normalizeDate(appt.date);
        
        appt.date = new Date(newDate);
        appt.slot = newSlot;
        appt.status = "rescheduled";
        await appt.save();

        const { delCache } = require("../redisClient");
        if (oldDateNormalized) {
            await delCache(`patient:availability:${appt.doctorId}:${oldDateNormalized}`);
        }
        
        const newDateNormalized = normalizeDate(appt.date);
        if (newDateNormalized && newDateNormalized !== oldDateNormalized) {
            await delCache(`patient:availability:${appt.doctorId}:${newDateNormalized}`);
        }

        res.json({ message: "Appointment rescheduled successfully", appointment: appt });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

patientRouter.get("/history", async (req, res) => {
    try {
        const patientId = await getPatientId(req.user.id);
        const history = await Consultation.find({ patientId }).populate("doctorId").populate("appointmentId");
        
        // Decrypt clinical notes safely for the authorized patient
        history.forEach(c => {
            if (c.notes) {
                c.notes = encryptionService.decrypt(c.notes);
            }
        });

        res.json(history);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

patientRouter.get("/reports", async (req, res) => {
    try {
        const patientId = await getPatientId(req.user.id);
        const reports = await LabReport.find({ patientId }).populate("doctorId").populate("requestId");
        res.json(reports);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

patientRouter.get("/bills", async (req, res) => {
    try {
        const patientId = await getPatientId(req.user.id);
        const bills = await Bill.find({ patientId });
        res.json(bills);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

patientRouter.get("/prescriptions", async (req, res) => {
    try {
        const patientId = await getPatientId(req.user.id);
        const Prescription = require("../models/Prescription.js");
        const prescriptions = await Prescription.find({ patientId })
            .populate("doctorId", "name")
            .populate("medicines.medicineId", "name");
        res.json(prescriptions);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

patientRouter.post("/associate-abha", async (req, res) => {
    try {
        const { abhaAddress, patientId } = req.body;
        if (!abhaAddress) return res.status(400).json({ message: "abhaAddress is required" });

        const abhaService = require("../services/abdm/abhaAssociationService");
        const mongoose = require("mongoose");

        let targetPatientId;
        if (req.user.role === "patient") {
            targetPatientId = await getPatientId(req.user.id);
        } else {
            if (!patientId) return res.status(400).json({ message: "patientId is required for staff" });
            if (!mongoose.Types.ObjectId.isValid(patientId)) return res.status(400).json({ message: "Malformed patientId" });
            targetPatientId = patientId;
        }

        const ipAddress = req.ip || req.socket.remoteAddress;
        await abhaService.storeAbhaAddress(targetPatientId, abhaAddress, req.user.id, ipAddress);

        res.json({ message: "ABHA Address associated successfully" });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ message: "This ABHA Address is already associated with an existing patient profile" });
        }
        if (err.message === "Patient not found" || err.message === "Invalid ABHA Address") {
            return res.status(400).json({ message: err.message });
        }
        res.status(500).json({ message: err.message });
    }
});

module.exports = patientRouter;
