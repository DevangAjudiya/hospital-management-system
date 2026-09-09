const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

require("dotenv").config();

const app = express();
const port = process.env.PORT;


app.use(express.json());
app.use(cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true
}));

// DB Connection
const mongoURI = process.env.MONGODB_URI;
mongoose.connect(mongoURI).then(() => {
    console.log("Connected to MongoDB database");
    console.log("→ Database name:", mongoose.connection.name);
}).catch((err) => {
    console.error("Error connecting to database:", err.message); // <-- CHANGED: .message shows the ACTUAL reason
});

// <-- MOVED OUT of the .then() block — now always registered, reports live status
app.get('/api/debug/db-status', (req, res) => {
    res.json({
        readyState: mongoose.connection.readyState, // 1 = connected, 0 = disconnected, 2 = connecting, 3 = disconnecting
        dbName: mongoose.connection.name,
        host: mongoose.connection.host
    });
});

const Summary = require('./summaryModule/summary.model');
app.get('/api/debug/schema-check', (req, res) => {
    const path = Summary.schema.path('documentTimeline');
    res.json({
        instance: path.instance,
        caster: path.caster ? path.caster.instance : null,
        schemaKeys: path.schema ? Object.keys(path.schema.paths) : null
    });
});

// server.js — additive only
const summaryRoutes = require('./summaryModule/summary.routes');
app.use('/api/summary', summaryRoutes);

// Redis Connection
const { connectRedis } = require("./redisClient");
connectRedis();

// RabbitMQ Connection
const { connectRabbitMQ } = require("./rabbitmqClient");
connectRabbitMQ();

// Alert Redis Pub/Sub Subscriber (receives alerts from worker container)
const { startAlertSubscription } = require("./alertModule/alertRedisBridge");
startAlertSubscription();

// Routers
const authRouter = require("./router/auth.js");
const adminRouter = require("./router/admin.js");
const patientRouter = require("./router/patient.js");
const doctorRouter = require("./router/doctor.js");
const labRouter = require("./router/lab.js");
const pharmacyRouter = require("./router/pharmacy.js");
const receptionistRouter = require("./router/receptionist.js");
const billRouter = require("./router/bill.js");
const consentRouter = require("./router/consent.js");
const alertRouter = require("./alertModule/alert.routes.js");
const kioskAuthRouter = require("./alertModule/kioskAuth.js");
// D3: Consent-gated proxy routers for Module A (Nisarg AI) and Module B (Devang AI)
const kioskProxyRouter = require("./router/kioskProxy.js");
const documentProxyRouter = require("./router/documentProxy.js");
// const abdmRouter = require("./router/abdm.js"); // Removed, imported below

// API Mounts
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/patient", patientRouter);
app.use("/api/doctor", doctorRouter);
app.use("/api/lab", labRouter);
app.use("/api/pharmacy", pharmacyRouter);
app.use("/api/receptionist", receptionistRouter);
app.use("/api/billing", billRouter);
app.use("/api/consent", consentRouter);
app.use("/api/triage/alerts", alertRouter);
app.use("/api/kiosk", kioskAuthRouter);
// D3: Module A proxy — consent-gated interview + transcription forwarding
app.use("/api/kiosk", kioskProxyRouter);
// D3: Module B proxy — consent-gated document OCR forwarding
app.use("/api/document", documentProxyRouter);

// ABDM Callbacks
const { abdmRouter, notifyRouter } = require("./router/abdm.js");
app.use("/v1", abdmRouter);
app.use("/v0.5", notifyRouter);


app.get("/", (req, res) => {
    res.send("HMS API is running.");
});

app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});