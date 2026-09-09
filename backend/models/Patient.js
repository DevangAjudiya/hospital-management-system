const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  abhaAddress: { type: String, default: null },
  abhaAddressHash: { type: String, default: null, index: true, unique: true, sparse: true },
  dateOfBirth: { type: Date },
  gender: { type: String, enum: ["male", "female", "other"] },
  phoneNumber: { type: String },
  address: { type: String },
  medicalHistory: { type: String },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room", default: null }
}, { timestamps: true });

module.exports = mongoose.model("Patient", patientSchema);
