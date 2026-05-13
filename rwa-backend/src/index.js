import "dotenv/config";
import express from "express";

import cors from "cors";
import kycRoutes from "./routes/kyc.js";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import landRoutes from "./routes/land.js";
import validatorRoutes from "./routes/validator.js";
import faucetRoutes from "./routes/faucet.js";
const app = express();

/* ✅ CORS goes HERE */
app.use(
  cors({
    origin: [
      "http://localhost:3000", 
      "http://127.0.0.1:3000", 
      process.env.FRONTEND_URL,
      "https://rwa-fu8n.vercel.app", // Explicit production fallback
      "https://rwa-pied.vercel.app"  // Active frontend domain
    ].filter(Boolean),
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

/* ✅ body parser */
app.use(express.json());

/* ✅ health check */
app.get("/health", (req, res) => res.json({ status: "ok", message: "RWA Backend is active" }));
app.get("/api/health", (req, res) => res.json({ status: "ok", message: "RWA Backend is active" }));

/* ✅ routes (Dual mounting for Vercel compatibility) */
app.use("/", authRoutes);
app.use("/api", authRoutes);

app.use("/kyc", kycRoutes);
app.use("/api/kyc", kycRoutes);

app.use("/admin", adminRoutes);
app.use("/api/admin", adminRoutes);

app.use("/validator", validatorRoutes);
app.use("/api/validator", validatorRoutes);

app.use("/land", landRoutes);
app.use("/api/land", landRoutes);

app.use("/tokens", faucetRoutes);
app.use("/api/tokens", faucetRoutes);

const PORT = process.env.PORT || 3001;

// Only listen locally. Vercel Serverless handles the listening automatically.
if (process.env.NODE_ENV !== "production" && process.env.VERCEL !== "1") {
  app.listen(PORT, () => {
    console.log(`✅ Backend running on port ${PORT}`);
  });
}

export default app;