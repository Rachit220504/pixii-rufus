"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Sparkles, ShoppingBag, PanelRightOpen, X } from "lucide-react";
import { searchProducts, chatWithAssistant } from "@/lib/api";
import type { ChatMessage, QueryResult } from "@/types/index";
import { ProductRecommendations } from "./ProductRecommendations";
import { LogoutButton } from "./LogoutButton";
import { ThemeToggle } from "./ThemeToggle";

const SUGGESTED_QUERIES = [
  "Best magnesium supplement for seniors",
  "Best budget mechanical keyboard under 3000 INR",
  "Which protein powder has least side effects?",
  "Best wireless headphones for gym",
  "Top rated vitamin D supplement",
];

export function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentResult, setCurrentResult] = useState<QueryResult | null>(null);
  const [showMobileRecs, setShowMobileRecs] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recsRef = useRef<HTMLDivElement>(null);

  // Check mobile on mount
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close mobile recs when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMobileRecs && recsRef.current && !recsRef.current.contains(event.target as Node)) {
        setShowMobileRecs(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMobileRecs]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (messageText: string = input) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Check if this is a follow-up message (we have previous context)
      const lastAssistantMessage = messages.findLast(m => m.role === "assistant" && m.recommendations);
      const isFollowUp = lastAssistantMessage && messages.length > 2;
      
      let chatResult;
      
      if (isFollowUp && lastAssistantMessage.recommendations) {
        // Use existing context for follow-up questions
        chatResult = await chatWithAssistant(messageText, lastAssistantMessage.recommendations);
      } else {
        // New search for initial queries
        const result = await searchProducts({
          query: messageText,
          maxResults: 5,
        });

        if (result.success && result.data) {
          setCurrentResult(result.data);
          chatResult = await chatWithAssistant(messageText, result.data);
        } else {
          throw new Error(result.error || "Failed to get recommendations");
        }
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: chatResult.data?.response || "Here are my recommendations based on the reviews:",
        timestamp: new Date().toISOString(),
        recommendations: chatResult.data?.recommendations || lastAssistantMessage?.recommendations,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      
      // Update current result if we got new recommendations
      if (chatResult.data?.recommendations) {
        setCurrentResult(chatResult.data.recommendations);
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I apologize, but I encountered an error while processing your request. Please try again.",
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile Overlay Backdrop */}
      {showMobileRecs && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" />
      )}

      {/* Left Panel - Chat */}
      <div className="flex-1 flex flex-col w-full max-w-none lg:max-w-3xl lg:mx-auto">
        {/* Header */}
        <div className="bg-amazon-dark text-white p-3 sm:p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amazon-orange rounded-full flex items-center justify-center flex-shrink-0">
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-amazon-dark" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-base sm:text-lg truncate">Rufus AI Shopper</h1>
              <p className="text-[10px] sm:text-xs text-gray-300 hidden sm:block">Powered by Gemini AI</p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* Mobile Recs Toggle */}
            {isMobile && currentResult && messages.length > 0 && (
              <button
                onClick={() => setShowMobileRecs(true)}
                className="p-2 text-white hover:bg-white/10 rounded-lg lg:hidden"
                title="Show Recommendations"
              >
                <PanelRightOpen className="w-5 h-5" />
              </button>
            )}
            <ThemeToggle variant="icon" className="text-white" />
            <LogoutButton variant="icon" className="text-white hover:text-red-400 hover:bg-red-900/30" />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8 sm:py-12 px-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-amazon-orange/20 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-amazon-orange" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">
                Welcome to Rufus AI Shopper
              </h2>
              <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 max-w-md mx-auto">
                Ask me anything about products. I analyze thousands of reviews to give you personalized recommendations.
              </p>
              
              <div className="space-y-2 max-w-md mx-auto">
                <p className="text-xs sm:text-sm text-gray-500 font-medium">Try asking:</p>
                {SUGGESTED_QUERIES.map((query, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(query)}
                    className="block w-full text-left p-2.5 sm:p-3 bg-white rounded-lg border border-gray-200 hover:border-amazon-blue hover:shadow-sm transition-all text-xs sm:text-sm text-gray-700"
                  >
                    {query}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div className={`max-w-[92%] sm:max-w-[85%] lg:max-w-[75%] rounded-lg p-3 sm:p-4 ${
                message.role === "user"
                  ? "bg-amazon-blue text-white"
                  : "bg-white border border-gray-200 shadow-sm text-gray-900"
              }`}>
                <p className="text-sm leading-relaxed">{message.content}</p>
                <span className={`text-xs mt-2 block ${
                  message.role === "user" ? "text-blue-100" : "text-gray-400"
                }`}>
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="chat-message chat-message-assistant flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Analyzing reviews...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 sm:p-4 bg-white border-t border-gray-200">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask about products..."
              className="flex-1 p-2.5 sm:p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-amazon-blue focus:border-transparent text-sm text-gray-900 bg-white"
              rows={2}
              disabled={isLoading}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="px-3 sm:px-4 py-2 bg-amazon-orange text-amazon-dark rounded-lg font-medium hover:bg-amazon-orange/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 flex-shrink-0"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
              ) : (
                <Send className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center hidden sm:block">
            Press Enter to send • Shift+Enter for new line
          </p>
        </div>
      </div>

      {/* Right Panel - Recommendations */}
      {currentResult && messages.length > 0 && (
        <>
          {/* Desktop */}
          <div className="hidden lg:block w-[400px] xl:w-[450px] bg-white border-l border-gray-200 overflow-y-auto animate-slide-in">
            <ProductRecommendations result={currentResult} />
          </div>
          
          {/* Mobile Sheet */}
          <div 
            ref={recsRef}
            className={`lg:hidden fixed inset-y-0 right-0 z-50 w-full sm:w-[400px] transform transition-transform duration-300 ${
              showMobileRecs ? 'translate-x-0' : 'translate-x-full'
            } bg-white border-l border-gray-200 overflow-y-auto`}
          >
            <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-700 text-sm">AI Recommendations</h3>
              <button
                onClick={() => setShowMobileRecs(false)}
                className="p-2 hover:bg-gray-200 rounded-lg"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <ProductRecommendations result={currentResult} />
          </div>
        </>
      )}
    </div>
  );
}
