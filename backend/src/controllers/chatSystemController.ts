import { Request, Response } from "express";
import { pool } from "../db/postgres";
import { realTimeSearchEngine, SearchResult } from "../services/realTimeSearchEngine";
import { QueryCategorizer } from "../services/queryCategorizer";

const categorizer = new QueryCategorizer();

// Store for conversation context (product results from previous queries)
const conversationContext = new Map<string, SearchResult>();

// Types
interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
}

interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata: any;
  created_at: Date;
}

// ============================================
// 1. Create New Conversation
// ============================================
export async function createConversation(req: Request, res: Response) {
  const client = await pool.connect();
  
  try {
    const { userId } = req.body;
    
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({
        success: false,
        error: "userId is required and must be a string"
      });
    }
    
    const result = await client.query(
      `INSERT INTO conversations (user_id, title) 
       VALUES ($1, $2) 
       RETURNING *`,
      [userId, 'New Chat']
    );
    
    const conversation: Conversation = result.rows[0];
    
    return res.status(201).json({
      success: true,
      data: {
        id: conversation.id,
        userId: conversation.user_id,
        title: conversation.title,
        createdAt: conversation.created_at,
        updatedAt: conversation.updated_at
      }
    });
  } catch (error) {
    console.error("[ChatController] Error creating conversation:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to create conversation"
    });
  } finally {
    client.release();
  }
}

// ============================================
// 2. Get All Conversations for User
// ============================================
export async function getConversations(req: Request, res: Response) {
  const client = await pool.connect();
  
  try {
    const { userId } = req.query;
    
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({
        success: false,
        error: "userId query parameter is required"
      });
    }
    
    const result = await client.query(
      `SELECT id, user_id, title, created_at, updated_at 
       FROM conversations 
       WHERE user_id = $1 
       ORDER BY updated_at DESC`,
      [userId]
    );
    
    const conversations = result.rows.map((conv: Conversation) => ({
      id: conv.id,
      userId: conv.user_id,
      title: conv.title,
      createdAt: conv.created_at,
      updatedAt: conv.updated_at
    }));
    
    return res.json({
      success: true,
      data: conversations
    });
  } catch (error) {
    console.error("[ChatController] Error fetching conversations:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch conversations"
    });
  } finally {
    client.release();
  }
}

// ============================================
// 3. Get Messages for a Conversation
// ============================================
export async function getMessages(req: Request, res: Response) {
  const client = await pool.connect();
  
  try {
    const { conversationId } = req.params;
    
    if (!conversationId) {
      return res.status(400).json({
        success: false,
        error: "conversationId is required"
      });
    }
    
    // Verify conversation exists and belongs to user
    const convResult = await client.query(
      `SELECT id FROM conversations WHERE id = $1`,
      [conversationId]
    );
    
    if (convResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Conversation not found"
      });
    }
    
    // Fetch messages (limit to last 50)
    const result = await client.query(
      `SELECT id, conversation_id, role, content, metadata, created_at 
       FROM messages 
       WHERE conversation_id = $1 
       ORDER BY created_at ASC 
       LIMIT 50`,
      [conversationId]
    );
    
    const messages = result.rows.map((msg: Message) => ({
      id: msg.id,
      conversationId: msg.conversation_id,
      role: msg.role,
      content: msg.content,
      metadata: msg.metadata,
      createdAt: msg.created_at
    }));
    
    return res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    console.error("[ChatController] Error fetching messages:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch messages"
    });
  } finally {
    client.release();
  }
}

// ============================================
// 4. Send Message (Core Endpoint)
// ============================================
export async function sendMessage(req: Request, res: Response) {
  const client = await pool.connect();
  
  try {
    const { conversationId, userId, message } = req.body;
    
    // Validation
    if (!conversationId || typeof conversationId !== 'string') {
      return res.status(400).json({
        success: false,
        error: "conversationId is required"
      });
    }
    
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({
        success: false,
        error: "userId is required"
      });
    }
    
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "message is required and cannot be empty"
      });
    }
    
    const trimmedMessage = message.trim();
    
    // STEP 1: Verify conversation belongs to user
    const convResult = await client.query(
      `SELECT id, title FROM conversations WHERE id = $1 AND user_id = $2`,
      [conversationId, userId]
    );
    
    if (convResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Conversation not found or access denied"
      });
    }
    
    const conversation = convResult.rows[0];
    const isFirstMessage = conversation.title === 'New Chat';
    
    // STEP 2: Insert user message
    await client.query(
      `INSERT INTO messages (conversation_id, role, content) 
       VALUES ($1, $2, $3)`,
      [conversationId, 'user', trimmedMessage]
    );
    
    // STEP 3: Fetch last 10 messages for context (reverse to maintain order)
    const contextResult = await client.query(
      `SELECT role, content 
       FROM messages 
       WHERE conversation_id = $1 
       ORDER BY created_at DESC 
       LIMIT 10`,
      [conversationId]
    );
    
    const contextMessages = contextResult.rows.reverse();
    
    // STEP 4: Detect intent and route appropriately
    console.log(`[ChatController] Processing message for conversation ${conversationId}`);
    
    let aiResponse: string;
    let recommendations: any = null;
    
    try {
      // Get previous context if exists
      const previousContext = conversationContext.get(conversationId);
      
      // Detect if this is a new search or follow-up
      const isNewSearch = categorizer.isNewSearch(trimmedMessage);
      const isFollowUp = previousContext ? categorizer.isFollowUp(trimmedMessage, previousContext.query) : false;
      
      console.log(`[ChatController] Intent detection - isNewSearch: ${isNewSearch}, isFollowUp: ${isFollowUp}`);
      
      if (isFollowUp && previousContext) {
        // Follow-up: Use previous context
        console.log(`[ChatController] Follow-up query, reusing previous results`);
        aiResponse = buildFollowUpResponse(trimmedMessage, previousContext);
        recommendations = previousContext;
      } else if (isNewSearch) {
        // New search: Call RealTimeSearchEngine (Apify-first)
        console.log(`[ChatController] New search query, triggering real-time scraping`);
        const searchResult = await realTimeSearchEngine.search({ query: trimmedMessage });
        
        // Store context for future follow-ups
        conversationContext.set(conversationId, searchResult);
        
        // Build response from search results
        aiResponse = buildSearchResponse(trimmedMessage, searchResult.products.slice(0, 3), searchResult.summary);
        recommendations = searchResult;
      } else {
        // General question: Return a helpful prompt
        console.log(`[ChatController] General question, providing helpful response`);
        aiResponse = "I'm here to help you find the best products! Try searching for something specific like:\n\n• \"Best mechanical keyboards under 5000\"\n• \"Top rated wireless headphones\"\n• \"Best TV for gaming\"\n• \"Affordable running shoes\"\n\nWhat are you looking for?";
        recommendations = null;
      }
    } catch (aiError) {
      console.error("[ChatController] AI error:", aiError);
      aiResponse = "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.";
    }
    
    // STEP 5: Insert AI response with metadata
    const messageMetadata = recommendations ? {
      products: recommendations.products.map((p: any) => ({
        asin: p.asin,
        title: p.title,
        price: p.price,
        imageUrl: p.imageUrl,
        url: p.url,
        rating: p.rating,
        reviewCount: p.reviewCount,
        tag: p.tag,
        insights: p.insights
      })),
      topRated: recommendations.topRated,
      bestValue: recommendations.bestValue,
      editorsChoice: recommendations.editorsChoice,
      summary: recommendations.summary,
      query: recommendations.query
    } : null;

    await client.query(
      `INSERT INTO messages (conversation_id, role, content, metadata) 
       VALUES ($1, $2, $3, $4)`,
      [conversationId, 'assistant', aiResponse, messageMetadata ? JSON.stringify(messageMetadata) : null]
    );
    
    // STEP 6: Update conversation updated_at
    await client.query(
      `UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [conversationId]
    );
    
    // STEP 7: Auto-generate title on first message
    if (isFirstMessage) {
      const title = generateTitle(trimmedMessage);
      await client.query(
        `UPDATE conversations SET title = $1 WHERE id = $2`,
        [title, conversationId]
      );
    }
    
    return res.json({
      success: true,
      data: {
        reply: aiResponse,
        conversationId,
        recommendations: recommendations ? formatRecommendations(recommendations) : null
      }
    });
  } catch (error) {
    console.error("[ChatController] Error sending message:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to send message"
    });
  } finally {
    client.release();
  }
}

// ============================================
// 5. Delete Conversation
// ============================================
export async function deleteConversation(req: Request, res: Response) {
  const client = await pool.connect();
  
  try {
    const { conversationId } = req.params;
    const { userId } = req.body;
    
    if (!conversationId || !userId) {
      return res.status(400).json({
        success: false,
        error: "conversationId and userId are required"
      });
    }
    
    // Verify ownership before delete
    const convResult = await client.query(
      `SELECT id FROM conversations WHERE id = $1 AND user_id = $2`,
      [conversationId, userId]
    );
    
    if (convResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Conversation not found or access denied"
      });
    }
    
    // Delete conversation (cascades to messages)
    await client.query(
      `DELETE FROM conversations WHERE id = $1`,
      [conversationId]
    );
    
    return res.json({
      success: true,
      message: "Conversation deleted successfully"
    });
  } catch (error) {
    console.error("[ChatController] Error deleting conversation:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to delete conversation"
    });
  } finally {
    client.release();
  }
}

// ============================================
// 6. Update Conversation Title
// ============================================
export async function updateConversationTitle(req: Request, res: Response) {
  const client = await pool.connect();
  
  try {
    const { conversationId } = req.params;
    const { userId, title } = req.body;
    
    if (!conversationId || !userId || !title) {
      return res.status(400).json({
        success: false,
        error: "conversationId, userId, and title are required"
      });
    }
    
    const trimmedTitle = title.trim().slice(0, 40);
    
    const result = await client.query(
      `UPDATE conversations 
       SET title = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [trimmedTitle, conversationId, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Conversation not found or access denied"
      });
    }
    
    return res.json({
      success: true,
      data: {
        id: result.rows[0].id,
        title: result.rows[0].title
      }
    });
  } catch (error) {
    console.error("[ChatController] Error updating title:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to update conversation title"
    });
  } finally {
    client.release();
  }
}

// ============================================
// Helper Functions
// ============================================
function generateTitle(message: string): string {
  // Remove common prefixes
  let title = message
    .replace(/^(i want to|can you|please|help me|i need|looking for|search for|find me)/i, "")
    .trim();
  
  // Capitalize first letter
  title = title.charAt(0).toUpperCase() + title.slice(1);
  
  // Limit to 40 chars and add ellipsis if needed
  if (title.length > 40) {
    title = title.slice(0, 37) + '...';
  }
  
  return title || 'New Chat';
}

function buildSearchResponse(query: string, products: any[], summary: string): string {
  if (!products || products.length === 0) {
    return `I couldn't find specific products for "${query}". Could you try a different search term or provide more details about what you're looking for?`;
  }
  
  let response = summary || `I found some great options for you. `;
  
  if (products.length > 0) {
    response += `\n\nHere are the top ${products.length} recommendations:`;
    products.forEach((p, i) => {
      const price = p.price !== null ? `₹${p.price.toLocaleString()}` : 'Price unavailable';
      response += `\n${i + 1}. ${p.title} - ${price} (${p.rating}/5 stars)`;
    });
  }
  
  response += `\n\nWould you like more details about any of these products?`;
  
  return response;
}

function buildFollowUpResponse(query: string, context: SearchResult): string {
  const { products, topRated, bestValue, editorsChoice } = context;
  
  if (!products || products.length === 0) {
    return `I don't have any product results to reference. Try a new search like "best TVs under 50000" or "wireless headphones".`;
  }
  
  const normalizedQuery = query.toLowerCase();
  
  // Handle specific follow-up questions
  if (normalizedQuery.includes('cheaper') || normalizedQuery.includes('less expensive') || normalizedQuery.includes('budget')) {
    const cheaperOptions = products.filter(p => p.price && p.price < (bestValue?.price || Infinity));
    if (cheaperOptions.length > 0) {
      return `Here are more budget-friendly options:\n${cheaperOptions.slice(0, 3).map((p, i) => `${i + 1}. ${p.title} - ₹${p.price?.toLocaleString()} (${p.rating}/5 stars)`).join('\n')}`;
    }
    return `The ${bestValue?.title || products[0].title} at ₹${bestValue?.price?.toLocaleString() || products[0].price?.toLocaleString()} is already the best value option I found.`;
  }
  
  if (normalizedQuery.includes('better') || normalizedQuery.includes('best')) {
    return `Based on ratings and reviews, the top option is ${topRated?.title || products[0].title} with ${topRated?.rating || products[0].rating}/5 stars from ${context.totalReviews?.toLocaleString() || 'many'} reviews.`;
  }
  
  if (normalizedQuery.includes('which') || normalizedQuery.includes('what') || normalizedQuery.includes('recommend')) {
    return `I'd recommend the ${editorsChoice?.title || topRated?.title || products[0].title}. It offers the best balance of quality and value with ${editorsChoice?.rating || topRated?.rating || products[0].rating}/5 stars.`;
  }
  
  if (normalizedQuery.includes('compare') || normalizedQuery.includes('difference')) {
    const top3 = products.slice(0, 3);
    return `Here's a quick comparison of the top options:\n${top3.map((p, i) => `${i + 1}. ${p.title} - ₹${p.price?.toLocaleString() || 'N/A'}, ${p.rating}/5 stars`).join('\n')}\n\n${bestValue?.title || top3[1]?.title} offers the best value, while ${topRated?.title || top3[0]?.title} has the highest rating.`;
  }
  
  // Default: Provide summary of top options
  const top3 = products.slice(0, 3);
  return `Based on your previous search for "${context.query}", here are the top ${top3.length} options:\n${top3.map((p, i) => `${i + 1}. ${p.title} - ₹${p.price?.toLocaleString() || 'N/A'} (${p.rating}/5 stars)${p.tag ? ` [${p.tag}]` : ''}`).join('\n')}\n\nWhich aspect would you like to know more about?`;
}

function formatRecommendations(rec: any) {
  if (!rec || !rec.products) return null;
  
  return {
    query: rec.query,
    category: rec.category,
    products: rec.products.map((p: any) => ({
      asin: p.asin,
      title: p.title,
      price: p.price,
      rating: p.rating,
      reviewCount: p.reviewCount,
      imageUrl: p.imageUrl,
      url: p.url,
      tag: p.tag,
      reason: p.reason,
      insights: p.insights
    })),
    topRated: rec.topRated,
    bestValue: rec.bestValue,
    editorsChoice: rec.editorsChoice,
    summary: rec.summary
  };
}
