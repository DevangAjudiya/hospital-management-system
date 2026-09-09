const mongoose = require("mongoose");

const consentSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
  abdmConsentId: { type: String, default: null },
  purpose: { type: String, required: true },
  requestedDataTypes: [{ 
    type: String, 
    enum: ["Patient", "Encounter", "Condition", "MedicationStatement", "Observation", "All"] 
  }],
  status: { 
    type: String, 
    enum: ["GRANTED", "DENIED", "REVOKED", "EXPIRED", "PENDING"], 
    default: "PENDING" 
  },
  grantedAt: { type: Date },
  revokedAt: { type: Date },
  expiresAt: { type: Date, required: true },
  consentVersion: { type: Number, default: 1 },
  audioConsentProvided: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });

module.exports = mongoose.model("Consent", consentSchema);
