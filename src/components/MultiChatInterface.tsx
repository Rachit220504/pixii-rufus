"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Plus, Trash2, MessageSquare, MoreVertical, Edit2, PanelRightClose, PanelLeftOpen } from "lucide-react";
import { createConversation, getConversations, getMessages, sendMessage, deleteConversation, updateConversationTitle, type Conversation, type Message } from "@/lib/api";
import { ProductCarousel } from "./ProductCarousel";
import { LogoutButton } from "./LogoutButton";
import { ThemeToggle } from "./ThemeToggle";

interface MultiChatInterfaceProps {
  userId: string;
  userName?: string;
}

export function MultiChatInterface({ userId, userName }: MultiChatInterfaceProps) {
  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isRecsSidebarOpen, setIsRecsSidebarOpen] = useState(true);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [userId]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (activeConversationId) {
      loadMessages(activeConversationId);
    } else {
      setMessages([]);
    }
  }, [activeConversationId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    // Use setTimeout to ensure DOM updates before scrolling
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages, isLoading]);

  // Load all conversations for user
  async function loadConversations() {
    try {
      const result = await getConversations(userId);
      if (result.success && result.data) {
        setConversations(result.data);
        
        // Set first conversation as active if none selected
        if (result.data.length > 0 && !activeConversationId) {
          setActiveConversationId(result.data[0].id);
        }
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
    }
  }

  // Load messages for a conversation
  async function loadMessages(conversationId: string) {
    try {
      const result = await getMessages(conversationId);
      if (result.success && result.data) {
        setMessages(result.data);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  }

  // Create new conversation
  async function handleNewChat() {
    try {
      const result = await createConversation(userId);
      if (result.success && result.data) {
        setConversations([result.data, ...conversations]);
        setActiveConversationId(result.data.id);
        setMessages([]);
      }
    } catch (error) {
      console.error("Error creating conversation:", error);
    }
  }

  // Delete conversation
  async function handleDeleteConversation(conversationId: string, e: React.MouseEvent) {
    e.stopPropagation();
    
    if (!confirm("Are you sure you want to delete this conversation?")) {
      return;
    }
    
    try {
      const result = await deleteConversation(conversationId, userId);
      if (result.success) {
        setConversations(conversations.filter(c => c.id !== conversationId));
        
        if (activeConversationId === conversationId) {
          const remaining = conversations.filter(c => c.id !== conversationId);
          setActiveConversationId(remaining.length > 0 ? remaining[0].id : null);
        }
      }
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
  }

  // Start editing title
  function startEditingTitle(conversation: Conversation, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingTitle(conversation.id);
    setNewTitle(conversation.title);
  }

  // Save title
  async function saveTitle(conversationId: string) {
    if (!newTitle.trim()) return;
    
    try {
      const result = await updateConversationTitle(conversationId, userId, newTitle.trim());
      if (result.success) {
        setConversations(conversations.map(c => 
          c.id === conversationId ? { ...c, title: newTitle.trim() } : c
        ));
      }
    } catch (error) {
      console.error("Error updating title:", error);
    } finally {
      setEditingTitle(null);
      setNewTitle("");
    }
  }

  // Send message
  async function handleSendMessage(e?: React.FormEvent) {
    e?.preventDefault();
    
    if (!inputMessage.trim() || !activeConversationId || isLoading) return;

    const messageText = inputMessage.trim();
    setInputMessage("");
    
    // Add user message to UI immediately (optimistic update)
    const tempUserMessage: Message = {
      id: `temp_${Date.now()}`,
      conversationId: activeConversationId,
      role: "user",
      content: messageText,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMessage]);
    setIsLoading(true);

    try {
      const result = await sendMessage(activeConversationId, userId, messageText);

      if (result.success && result.data) {
        // Reload messages to get the updated conversation with AI reply (includes metadata)
        await loadMessages(activeConversationId);
        
        // Refresh conversation list to update titles/order
        await loadConversations();
      } else {
        throw new Error(result.error || "Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      // Add error message from AI
      const errorMessage: Message = {
        id: Date.now().toString(),
        conversationId: activeConversationId,
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Chat Sidebar - Left */}
      <div className={`${isSidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden shrink-0`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 bg-amazon-blue text-white px-4 py-2 rounded-lg hover:bg-amazon-dark transition-colors dark:bg-amazon-blue dark:hover:bg-amazon-dark"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
              No conversations yet
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => setActiveConversationId(conversation.id)}
                className={`group flex items-center gap-3 p-3 mx-2 my-1 rounded-lg cursor-pointer transition-colors ${
                  activeConversationId === conversation.id
                    ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                
                {editingTitle === conversation.id ? (
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onBlur={() => saveTitle(conversation.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveTitle(conversation.id);
                      if (e.key === 'Escape') {
                        setEditingTitle(null);
                        setNewTitle("");
                      }
                    }}
                    autoFocus
                    className="flex-1 text-sm bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-600 rounded px-2 py-1 outline-none dark:text-white"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">
                    {conversation.title}
                  </span>
                )}
                
                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => startEditingTitle(conversation, e)}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  >
                    <Edit2 className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteConversation(conversation.id, e)}
                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                  >
                    <Trash2 className="w-3 h-3 text-red-500" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* User Info */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {userName || 'User'}
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <LogoutButton />
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg lg:hidden"
            >
              <MoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <h2 className="font-semibold text-gray-800 dark:text-white">
              {activeConversation?.title || 'New Chat'}
            </h2>
          </div>
          
          {/* Recommendations Toggle - only show when sidebar is closed */}
          {!isRecsSidebarOpen && (
            <button
              onClick={() => setIsRecsSidebarOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Show Recommendations"
            >
              <PanelLeftOpen className="w-5 h-5 text-gray-600" />
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-amazon-orange/10 rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8 text-amazon-orange" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
                Welcome to Rufus AI Shopper
              </h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-md">
                Start a conversation to get personalized product recommendations powered by AI.
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div className="max-w-[90%]">
                <div
                  className={`rounded-lg p-4 ${
                    message.role === "user"
                      ? "bg-amazon-blue text-white"
                      : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm text-gray-900 dark:text-gray-100"
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-inherit">
                    {message.content}
                  </p>
                  <span
                    className={`text-xs mt-2 block ${
                      message.role === "user" ? "text-blue-100" : "text-gray-400 dark:text-gray-500"
                    }`}
                  >
                    {new Date(message.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Type your message..."
              className="flex-1 resize-none border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amazon-blue focus:border-transparent min-h-[44px] max-h-[120px] bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              disabled={isLoading || !activeConversationId}
              rows={1}
            />
            <button
              type="submit"
              disabled={isLoading || !inputMessage.trim() || !activeConversationId}
              className="px-6 py-3 bg-amazon-blue text-white rounded-lg hover:bg-amazon-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Press Enter to send • Shift+Enter for new line
          </p>
        </div>
      </div>
      
      {/* Product Recommendations Sidebar - Right */}
      <div className={`${isRecsSidebarOpen ? 'w-[600px]' : 'w-0'} transition-all duration-300 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden shrink-0`}>
        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-sm">AI Recommendations</h3>
          <button
            onClick={() => setIsRecsSidebarOpen(!isRecsSidebarOpen)}
            className="p-1 hover:bg-gray-200 rounded"
          >
            <PanelRightClose className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {/* Get recommendations from the latest assistant message with metadata */}
          {(() => {
            const lastAiMessage = [...messages].reverse().find(m => m.role === 'assistant' && m.metadata?.products);
            if (lastAiMessage?.metadata?.products) {
              return (
                <div className="space-y-4">
                  {/* Summary */}
                  {lastAiMessage.metadata.summary && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                      {lastAiMessage.metadata.summary}
                    </p>
                  )}
                  
                  {/* Top Picks */}
                  {lastAiMessage.metadata.topRated && (
                    <TopPickCard product={lastAiMessage.metadata.topRated} label="Top Rated" color="yellow" />
                  )}
                  {lastAiMessage.metadata.bestValue && lastAiMessage.metadata.bestValue.asin !== lastAiMessage.metadata.topRated?.asin && (
                    <TopPickCard product={lastAiMessage.metadata.bestValue} label="Best Value" color="green" />
                  )}
                  {lastAiMessage.metadata.editorsChoice && 
                   lastAiMessage.metadata.editorsChoice.asin !== lastAiMessage.metadata.topRated?.asin && 
                   lastAiMessage.metadata.editorsChoice.asin !== lastAiMessage.metadata.bestValue?.asin && (
                    <TopPickCard product={lastAiMessage.metadata.editorsChoice} label="Editor's Choice" color="purple" />
                  )}
                  
                  {/* All Products */}
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3 text-base">All Products</h4>
                    <div className="flex flex-col gap-4">
                      {lastAiMessage.metadata.products.map((product: any, index: number) => (
                        <ProductCard key={product.asin || index} product={product} />
                      ))}
                    </div>
                  </div>
                </div>
              );
            }
            return (
              <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
                <p className="text-sm">No recommendations yet</p>
                <p className="text-xs mt-1">Start a conversation to see product recommendations</p>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

// Top Pick Card Component
function TopPickCard({ product, label, color }: { product: any; label: string; color: "yellow" | "green" | "purple" }) {
  const colorClasses = {
    yellow: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700",
    green: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700",
    purple: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700",
  };

  const badgeClasses = {
    yellow: "bg-yellow-400 text-yellow-900",
    green: "bg-green-400 text-green-900",
    purple: "bg-purple-400 text-purple-900",
  };

  return (
    <div className={`${colorClasses[color]} rounded-xl border-2 p-5 shadow-sm`}>
      <div className="mb-3">
        <span className={`inline-block px-3 py-1.5 rounded-lg text-sm font-bold ${badgeClasses[color]}`}>
          {label}
        </span>
      </div>
      <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-3">{product.title}</h3>
      <div className="flex items-center gap-4">
        <span className="text-lg font-bold text-amazon-dark dark:text-white">
          {product.price !== null ? `₹${product.price.toLocaleString()}` : "N/A"}
        </span>
        <div className="flex items-center gap-1.5 bg-white/50 dark:bg-white/10 px-3 py-1.5 rounded-lg">
          <svg className="w-5 h-5 text-yellow-500 fill-yellow-500" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span className="text-sm font-medium dark:text-gray-200">{product.rating}</span>
        </div>
      </div>
      {product.url && (
        <a
          href={product.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-amazon-blue hover:text-amazon-dark mt-4"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          View on Amazon
        </a>
      )}
    </div>
  );
}

// Product Card Component for Sidebar
function ProductCard({ product }: { product: any }) {
  const hasValidUrl = product.url && product.url.startsWith('https://www.amazon.');
  const hasValidImage = product.imageUrl && !product.imageUrl.includes('placeholder');
  const [imageError, setImageError] = useState(false);

  return (
    <a
      href={hasValidUrl ? product.url : undefined}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-5 p-4 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group border border-gray-200 dark:border-gray-700 shadow-sm dark:bg-gray-800/50"
    >
      {/* Image - Much Bigger */}
      <div className="w-36 h-36 bg-gray-50 dark:bg-gray-800 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden">
        {hasValidImage && !imageError ? (
          <img
            src={product.imageUrl}
            alt={product.title}
            className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform"
            onError={() => setImageError(true)}
          />
        ) : (
          <svg className="w-12 h-12 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <h4 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-2 mb-2">{product.title}</h4>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-bold text-amazon-dark dark:text-white text-base">
            {product.price !== null ? `₹${product.price.toLocaleString()}` : "N/A"}
          </span>
          <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded">
            <svg className="w-4 h-4 text-yellow-500 fill-yellow-500" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{product.rating}</span>
          </div>
          {product.reviewCount > 0 && (
            <span className="text-xs text-gray-500 dark:text-gray-400">({product.reviewCount} reviews)</span>
          )}
        </div>
        {product.tag && (
          <div className="mt-2">
            <span className={`inline-block text-[10px] px-2 py-1 rounded font-medium w-fit ${
              product.tag === 'Top Rated' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200' :
              product.tag === 'Best Value' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' :
              product.tag === "Editor's Choice" ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200' :
              'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
            }`}>
              {product.tag}
            </span>
          </div>
        )}
      </div>
    </a>
  );
}
