import express from "express";
import cors from "cors";
import path from "path";
import routes from "./src/routes";
import { config, validateConfig } from "./src/utils/config";
import { initPostgres } from "./src/db/postgres";

const app = express();
const PORT = config.server.port;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.use("/api", routes);

if (config.server.nodeEnv === "production") {
  app.use(express.static(path.join(__dirname, "../.next")));
}

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
});

async function startServer() {
  try {
    validateConfig();
    console.log("Configuration validated");

    await initPostgres();
    console.log("PostgreSQL initialized");

    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🛒 Rufus AI Shopper - Backend Server                     ║
║                                                            ║
║   Server running on http://localhost:${PORT}                   ║
║   API Health: http://localhost:${PORT}/api/health            ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

export default app;
