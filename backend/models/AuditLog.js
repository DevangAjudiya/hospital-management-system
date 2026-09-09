const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "Patient" },
  action: { type: String, required: true },
  category: { type: String, enum: ["CONSENT", "SECURITY", "SYSTEM", "ACCESS", "ABDM", "IDENTITY"], default: "SYSTEM" },
  details: { type: String },
  resourceType: { type: String },
  resourceId: { type: String },
  purpose: { type: String },
  consentId: { type: mongoose.Schema.Types.ObjectId, ref: "Consent" },
  success: { type: Boolean, default: true },
  reason: { type: String },
  ipAddress: { type: String },
  expiresAt: { type: Date, index: { expires: '0' } }
}, { timestamps: true });

// Protect against application-level modifications
const preventUpdate = function(next) {
  next(new Error("Audit logs are append-only and cannot be modified"));
};

auditLogSchema.pre('updateOne', preventUpdate);
auditLogSchema.pre('updateMany', preventUpdate);
auditLogSchema.pre('findOneAndUpdate', preventUpdate);
auditLogSchema.pre('replaceOne', preventUpdate);
auditLogSchema.pre('findOneAndReplace', preventUpdate);

module.exports = mongoose.model("AuditLog", auditLogSchema);
