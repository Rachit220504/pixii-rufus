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
};

export function validateConfig(): void {
  const required = ["google.apiKey"];
  const missing: string[] = [];

  if (!config.google.apiKey) missing.push("GOOGLE_API_KEY");

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}
