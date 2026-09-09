require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Patient = require('./models/Patient');
const User = require('./models/User');
const Consent = require('./models/Consent');

const JWT_SECRET = process.env.JWT_SECRET || 'hospital-secret-key';

// This is the exact clinical_summary from the user's console log
const clinicalSummary = {"chief_complaint":"fever","chief_complaint_display_name":"Fever","chief_complaint_confidence":0.99,"hpi":[{"id":"duration","question":"How many days have you had the fever?","answer":"lt_3_days"},{"id":"pattern","question":"Is the fever continuous, or does it come and go with chills?","answer":"continuous"},{"id":"peak_temp","question":"How high has the fever gone, if measured?","answer":"lt_100"},{"id":"associated_symptoms","question":"Any other symptoms — rash, joint pain, cough, loose motions, burning urine, headache?","answer":["cough"]}],"additional_history":[{"id":"respiratory_history","question":"Do you have any long-term lung condition — asthma, COPD, TB?","answer":"none"}],"extended_history":{"past_medical_history":[{"id":"pmh_chronic_conditions","question":"Do you have any long-term medical conditions, such as diabetes, high blood pressure, thyroid problems, asthma, or heart disease?","answer":["none"]},{"id":"pmh_past_surgeries","question":"Have you had any surgeries in the past?","answer":"no"},{"id":"pmh_hospitalizations","question":"Have you been hospitalized for any reason in the past?","answer":"no"}],"drug_history":[{"id":"dh_current_medications","question":"Are you currently taking any medications regularly, including over-the-counter or herbal remedies?","answer":"yes"},{"id":"dh_drug_allergies","question":"Do you have any known allergies to medications?","answer":["none"]},{"id":"dh_recent_new_medication","question":"Have you started any new medication in the last month?","answer":"no"}],"family_history":[{"id":"fh_family_conditions","question":"Does anyone in your immediate family — parents, siblings, or children — have any of these conditions?","answer":["diabetes"]},{"id":"fh_early_cardiac_death","question":"Has any close family member died suddenly or at a young age (under 50) from a heart problem?","answer":"no"}],"personal_history":[{"id":"ph_smoking_status","question":"Do you currently smoke, or have you smoked in the past?","answer":"never_smoked"},{"id":"ph_alcohol_use","question":"Do you drink alcohol?","answer":"never"},{"id":"ph_occupation","question":"What is your occupation?","answer":"lawyer"},{"id":"ph_physical_activity","question":"How would you describe your usual level of physical activity?","answer":"moderately_active"}]},"review_of_systems":{"general":[{"id":"ros_fatigue","question":"Have you been feeling unusually tired lately?","answer":"yes"},{"id":"ros_sleep","question":"Any recent change in your sleep?","answer":"yes"},{"id":"ros_appetite_general","question":"Any change in appetite or energy levels?","answer":"no"}],"respiratory":[{"id":"ros_wheeze","question":"Do you ever hear a whistling sound when you breathe?","answer":"no"},{"id":"ros_night_cough","question":"Does a cough wake you at night?","answer":"yes"},{"id":"ros_smoking","question":"Do you currently smoke, or have you smoked in the past?","answer":"no"}],"gi":[{"id":"ros_appetite","question":"Has your appetite changed recently?","answer":"no"},{"id":"ros_weight_change","question":"Any unintentional weight loss or gain recently?","answer":"no"},{"id":"ros_bowel_habit","question":"Any recent change in your usual bowel habit?","answer":"no"}],"genitourinary":[{"id":"ros_urinary_frequency","question":"Any change in how often you urinate?","answer":"no"},{"id":"ros_urinary_burning","question":"Any burning or pain while urinating?","answer":"no"}]},"ayush":{},"red_flags":{"detected":false,"severity":null,"details":[]}};

async function reproduce() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const pid = '6a9c1ec77e3089b11786b82b';
  const patient = await Patient.findById(pid);
  const user = await User.findById(patient.userId);
  
  // Check consent status
  const consent = await Consent.findOne({
    patientId: patient._id,
    purpose: 'kiosk-consultation',
    status: 'GRANTED'
  }).sort({ createdAt: -1 });
  
  console.log('Consent:', consent ? {
    status: consent.status,
    expiresAt: consent.expiresAt,
    expired: consent.expiresAt < new Date(),
    now: new Date()
  } : 'NO CONSENT FOUND');

  // Generate token exactly like auth.js does
  const token = jwt.sign(
    { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
    JWT_SECRET,
    { expiresIn: '10h' }
  );

  // This is the exact payload KioskInterview.jsx sends
  // Note: patientId is in the object but summaryApi.js strips it (not in destructured params)
  // summaryApi.js only sends interviewData, documentTimeline, analyzedDocuments
  const payload = {};
  // interviewData = clinicalSummary (truthy)
  payload.interviewData = clinicalSummary;
  // documentTimeline = [] (truthy! Boolean([]) === true)
  payload.documentTimeline = [];
  // analyzedDocuments = [] (truthy!)
  payload.analyzedDocuments = [];

  console.log('\n--- Sending exact KioskInterview payload to /api/summary/generate ---');
  console.log('Payload keys:', Object.keys(payload));
  console.log('documentTimeline length:', payload.documentTimeline.length);
  console.log('analyzedDocuments length:', payload.analyzedDocuments.length);

  const res = await fetch('http://localhost:8080/api/summary/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  console.log('\nHTTP Status:', res.status);
  const rawText = await res.text();
  console.log('Raw response (first 500 chars):', rawText.slice(0, 500));
  
  try {
    const json = JSON.parse(rawText);
    console.log('Parsed JSON:', JSON.stringify(json, null, 2));
  } catch (e) {
    console.error('Response is NOT valid JSON');
  }

  await mongoose.disconnect();
}

reproduce().catch(e => { console.error('SCRIPT ERROR:', e); process.exit(1); });
