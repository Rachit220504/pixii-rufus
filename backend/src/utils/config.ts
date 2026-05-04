import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../../../.env") });

export const config = {
  google: {
    apiKey: process.env.GOOGLE_API_KEY || "",
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    model: "gemini-2.5-flash",
    temperature: 0.3,
    maxTokens: 2048,
  },
  apify: {
    token: process.env.APIFY_TOKEN || "",
  },
  database: {
    faissIndexPath: process.env.FAISS_INDEX_PATH || "./backend/data/faiss/index.bin",
    metadataDbPath: process.env.METADATA_DB_PATH || "./backend/data/processed/products.db",
    rawDataPath: process.env.RAW_DATA_PATH || "./backend/data/raw",
    postgresUrl: process.env.POSTGRES_URL || "",
  },
  server: {
    port: parseInt(process.env.PORT || "3001"),
    nodeEnv: process.env.NODE_ENV || "development",
  },
  embeddings: {
    dimension: 768,
    model: "gemini-embedding",
    chunkSize: 512,
    chunkOverlap: 128,
  },
  search: {
    topK: 20,
    minSimilarity: 0.3,
  },
  // Legacy SMTP config (kept for backwards compatibility)
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || "",
  },
  // Brevo API configuration (Sendinblue) - for password reset emails
  email: {
    brevoApiKey: process.env.BREVO_API_KEY || "",
    from: process.env.EMAIL_FROM || "rufus.ai.project@gmail.com",
  },
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
};

export function validateConfig(): void {
  const required = ["google.apiKey"];
  const missing: string[] = [];

  if (!config.google.apiKey) missing.push("GOOGLE_API_KEY");

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}
