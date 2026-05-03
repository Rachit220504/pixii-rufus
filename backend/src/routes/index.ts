import { Router } from "express";
import {
  searchProducts,
  getCacheStats,
  clearCache,
} from "../controllers/searchController";
import { chat } from "../controllers/chatController";
import { authMiddleware } from "../middleware/auth";
import authRoutes from "./auth";

const router = Router();

// Auth routes
router.use("/auth", authRoutes);

// Search routes - new real-time architecture
router.post("/search", authMiddleware, searchProducts);

// Chat routes
router.post("/chat", authMiddleware, chat);

// Cache management routes
router.get("/cache/stats", authMiddleware, getCacheStats);
router.post("/cache/clear", authMiddleware, clearCache);

router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Rufus AI Shopper API is running",
    timestamp: new Date().toISOString(),
  });
});

export default router;
