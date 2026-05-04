import { Router } from "express";
import {
  createConversation,
  getConversations,
  getMessages,
  sendMessage,
  deleteConversation,
  updateConversationTitle,
} from "../controllers/chatSystemController";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// ============================================
// Chat System Routes
// ============================================

// Create new conversation
// POST /api/conversation
router.post("/conversation", authMiddleware, createConversation);

// Get all conversations for user
// GET /api/conversations?userId=123
router.get("/conversations", authMiddleware, getConversations);

// Get messages for a conversation
// GET /api/messages/:conversationId
router.get("/messages/:conversationId", authMiddleware, getMessages);

// Send message (core endpoint)
// POST /api/message
router.post("/message", authMiddleware, sendMessage);

// Update conversation title
// PUT /api/conversation/:conversationId/title
router.put("/conversation/:conversationId/title", authMiddleware, updateConversationTitle);

// Delete conversation
// DELETE /api/conversation/:conversationId
router.delete("/conversation/:conversationId", authMiddleware, deleteConversation);

export default router;
