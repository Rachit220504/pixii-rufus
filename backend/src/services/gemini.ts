import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { config } from "../utils/config";
import type { GeminiResponse, RawReview } from "../types";

export class GeminiService {
  private client: GoogleGenerativeAI;
  private model: GenerativeModel;
  private embeddingModel: GenerativeModel;
  private lastCallTime: number = 0;
  private cache: Map<string, { result: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly RATE_LIMIT_DELAY = 35000; // 35 seconds (matching Gemini's retry delay)
  private readonly MIN_CALL_INTERVAL = 2000; // 2 seconds between calls
  private readonly MAX_RETRIES = 2; // Maximum retry attempts

  constructor() {
    this.client = new GoogleGenerativeAI(config.google.apiKey);
    this.model = this.client.getGenerativeModel({
      model: config.google.model,
      generationConfig: {
        temperature: config.google.temperature,
        maxOutputTokens: config.google.maxTokens,
      },
    });
    this.embeddingModel = this.client.getGenerativeModel({
      model: "models/embedding-001",
    });
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCallTime;

    if (timeSinceLastCall < this.MIN_CALL_INTERVAL) {
      const delay = this.MIN_CALL_INTERVAL - timeSinceLastCall;
      console.log(`[Gemini] Rate limiting: waiting ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    this.lastCallTime = Date.now();
  }

  private getCacheKey(prefix: string, data: any): string {
    return `${prefix}:${JSON.stringify(data)}`;
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    console.log(`[Gemini] Cache HIT for ${key}`);
    return cached.result as T;
  }

  private setCache<T>(key: string, result: T): void {
    this.cache.set(key, { result, timestamp: Date.now() });
    console.log(`[Gemini] Cached result for ${key}`);
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const cacheKey = this.getCacheKey("embed", text);
    const cached = this.getFromCache<number[]>(cacheKey);
    if (cached) return cached;

    await this.rateLimit();

    // NOTE: Gemini embedding API is currently unavailable (404 error)
    // Using fallback embedding generation for now
    console.log(`[Gemini] Using fallback embedding for: ${text.substring(0, 50)}...`);
    const embedding = this.generateFallbackEmbedding(text);
    this.setCache(cacheKey, embedding);
    return embedding;

    /* Original API code - disabled due to 404 errors
    try {
      const result = await this.embeddingModel.embedContent(text);
      const embedding = result.embedding.values;
      this.setCache(cacheKey, embedding);
      return embedding;
    } catch (error) {
      console.error("Error generating embedding:", error);
      return this.generateFallbackEmbedding(text);
    }
    */
  }

  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    for (const text of texts) {
      const embedding = await this.generateEmbedding(text);
      embeddings.push(embedding);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return embeddings;
  }

  /**
   * Generate text response from Gemini
   */
  async generateText(prompt: string): Promise<string | null> {
    const cacheKey = this.getCacheKey("text", prompt);
    const cached = this.getFromCache<string>(cacheKey);
    if (cached) return cached;

    await this.rateLimit();

    try {
      console.log(`[Gemini] Generating text response...`);
      
      // Add timeout to prevent hanging requests
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 15000);
      });
      
      const result = await Promise.race([
        this.model.generateContent(prompt),
        timeoutPromise
      ]);
      
      const response = await result.response;
      const text = response.text();
      
      if (text) {
        this.setCache(cacheKey, text);
        return text;
      }
      return null;
    } catch (error: any) {
      // Check for specific error types and log appropriately
      if (error.message?.includes('fetch failed') || error.message?.includes('timeout') || error.code === 'ETIMEDOUT') {
        console.warn(`[Gemini] Network error (API unavailable), using fallback: ${error.message}`);
      } else if (error.status === 429) {
        console.warn(`[Gemini] Rate limited, using fallback`);
      } else {
        console.warn(`[Gemini] Text generation failed (using fallback): ${error.message || error}`);
      }
      
      return null;
    }
  }

  async analyzeReviews(
    productTitle: string,
    reviews: RawReview[],
    options?: { query?: string }
  ): Promise<{
    pros: string[];
    cons: string[];
    patterns: Array<{ pattern: string; frequency: number; sentiment: string; example: string }>;
    summary: string;
  }> {
    // LOCAL PROCESSING - No Gemini call for review analysis to reduce API usage
    console.log(`[Gemini] Using local analysis for ${reviews.length} reviews`);
    return this.localReviewAnalysis(reviews);
  }

  private localReviewAnalysis(reviews: RawReview[]): {
    pros: string[];
    cons: string[];
    patterns: Array<{ pattern: string; frequency: number; sentiment: string; example: string }>;
    summary: string;
  } {
    const positiveReviews = reviews.filter((r) => parseInt(r.rating) >= 4);
    const negativeReviews = reviews.filter((r) => parseInt(r.rating) <= 2);
    const neutralReviews = reviews.filter((r) => parseInt(r.rating) === 3);

    // Extract keywords from reviews
    const positiveKeywords = new Map<string, number>();
    const negativeKeywords = new Map<string, number>();

    const positiveWords = [
      "good",
      "great",
      "excellent",
      "amazing",
      "best",
      "love",
      "perfect",
      "works",
      "helpful",
      "effective",
      "quality",
      "value",
      "recommend",
      "easy",
      "fast",
      "comfortable",
      "durable",
      "reliable",
      "satisfied",
      "happy",
    ];
    const negativeWords = [
      "bad",
      "poor",
      "terrible",
      "worst",
      "hate",
      "disappointed",
      "waste",
      "expensive",
      "cheap",
      "broken",
      "slow",
      "difficult",
      "uncomfortable",
      "issue",
      "problem",
      "fail",
      "return",
      "refund",
      "not",
      "never",
    ];

    for (const review of reviews) {
      const text = review.content.toLowerCase();
      for (const word of positiveWords) {
        if (text.includes(word)) {
          positiveKeywords.set(word, (positiveKeywords.get(word) || 0) + 1);
        }
      }
      for (const word of negativeWords) {
        if (text.includes(word)) {
          negativeKeywords.set(word, (negativeKeywords.get(word) || 0) + 1);
        }
      }
    }

    // Generate pros from keywords
    const pros = Array.from(positiveKeywords.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word, count]) => `${word.charAt(0).toUpperCase() + word.slice(1)} quality (${count} mentions)`);

    // Generate cons from keywords
    const cons = Array.from(negativeKeywords.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word, count]) => `${word.charAt(0).toUpperCase() + word.slice(1)} issues (${count} mentions)`);

    // Fallback if no keywords found
    if (pros.length === 0) pros.push("Positive customer feedback", "Good overall quality");
    if (cons.length === 0) cons.push("Some mixed reviews", "Minor issues reported");

    const avgRating = reviews.reduce((sum, r) => sum + parseInt(r.rating), 0) / reviews.length;
    const sentiment = avgRating >= 4 ? "positive" : avgRating >= 3 ? "mixed" : "negative";

    return {
      pros,
      cons,
      patterns: [
        {
          pattern: "Overall satisfaction",
          frequency: positiveReviews.length,
          sentiment: "positive",
          example: positiveReviews[0]?.content || "N/A",
        },
        {
          pattern: "Issues reported",
          frequency: negativeReviews.length,
          sentiment: "negative",
          example: negativeReviews[0]?.content || "N/A",
        },
      ],
      summary: `${positiveReviews.length} positive, ${neutralReviews.length} neutral, and ${negativeReviews.length} negative reviews out of ${reviews.length} total. Overall sentiment is ${sentiment} with an average rating of ${avgRating.toFixed(1)}/5.`,
    };
  }

  async generateRecommendations(params: {
    query: string;
    context?: string;
    products: Array<{
      asin: string;
      title: string;
      price: string;
      rating: string;
      reviewCount: string;
      pros: string[];
      cons: string[];
      summary: string;
    }>;
    relevantReviews: string[];
  }): Promise<GeminiResponse> {
    const { query, context, products, relevantReviews } = params;

    // Check cache first
    const cacheKey = this.getCacheKey("rec", { query, products: products.map((p) => p.asin) });
    const cached = this.getFromCache<GeminiResponse>(cacheKey);
    if (cached) return cached;

    await this.rateLimit();

    const productInfo = products
      .map(
        (p, i) => `
Product ${i + 1} (${p.asin}):
- Title: ${p.title}
- Price: ${p.price}
- Rating: ${p.rating}/5 (${p.reviewCount} reviews)
- Pros: ${p.pros.join(", ")}
- Cons: ${p.cons.join(", ")}
- Summary: ${p.summary}
`,
      )
      .join("\n");

    const reviewsContext = relevantReviews.slice(0, 10).join("\n\n---\n\n");

    const prompt = `You are an expert e-commerce shopping assistant helping a user find products.

USER QUERY: "${query}"
${context ? `\nCONTEXT: ${context}` : ""}

AVAILABLE PRODUCTS:
${productInfo}

RELEVANT REVIEW EXCERPTS:
${reviewsContext}

Based on the user's query and the product data/reviews above, provide recommendations in this exact JSON format:

{
  "recommendations": {
    "bestOverall": "ASIN of the single best product overall",
    "bestBudget": "ASIN of best value/budget option",
    "bestForSpecific": "ASIN of best product for specific use case mentioned in query",
    "reasoning": {
      "bestOverall": "1-2 sentence explanation why this is best overall",
      "bestBudget": "1-2 sentence explanation of value proposition",
      "bestForSpecific": "1-2 sentence explanation of why it fits the specific need"
    }
  },
  "comparisons": [
    {
      "asin": "product ASIN",
      "strengths": ["strength1", "strength2", "strength3"],
      "weaknesses": ["weakness1", "weakness2"],
      "targetAudience": ["who should buy this"]
    }
  ],
  "insights": [
    "Key insight from reviews about user's query",
    "Another specific insight extracted from reviews"
  ]
}

Important:
1. Recommendations must be grounded in the review data provided
2. Be specific about WHY each product is recommended
3. Only use ASINs from the provided products
4. Return ONLY valid JSON
5. Consider the user's specific needs in the query`;

    try {
      const result = await this.model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const response: GeminiResponse = {
          recommendations: parsed.recommendations || {
            bestOverall: products[0]?.asin || "",
            bestBudget: products[1]?.asin || "",
            bestForSpecific: products[2]?.asin || "",
            reasoning: {
              bestOverall: "Highest rated option",
              bestBudget: "Most affordable choice",
              bestForSpecific: "Good all-rounder",
            },
          },
          comparisons: parsed.comparisons || this.fallbackComparisons(products),
          insights: parsed.insights || ["Based on available product data and reviews"],
        };
        this.setCache(cacheKey, response);
        return response;
      }
    } catch (error: any) {
      console.error("Error generating recommendations with Gemini:", error);
      if (error.status === 429) {
        console.error("Rate limit exceeded (429), using rule-based fallback");
      }
      const fallback = this.ruleBasedRecommendations(products, query);
      this.setCache(cacheKey, fallback);
      return fallback;
    }

    const fallback = this.ruleBasedRecommendations(products, query);
    this.setCache(cacheKey, fallback);
    return fallback;
  }
  fallbackComparisons(products: { asin: string; title: string; price: string; rating: string; reviewCount: string; pros: string[]; cons: string[]; summary: string; }[]): { asin: string; strengths: string[]; weaknesses: string[]; targetAudience: string[]; }[] {
    return products.map(p => ({
      asin: p.asin,
      strengths: p.pros.slice(0, 3),
      weaknesses: p.cons.slice(0, 2),
      targetAudience: ["General consumers looking for quality products"]
    }));
  }

  private ruleBasedRecommendations(products: any[], query: string): GeminiResponse {
    console.log(`[Gemini] Using rule-based recommendations for ${products.length} products`);

    if (products.length === 0) {
      return {
        recommendations: {
          bestOverall: "",
          bestBudget: "",
          bestForSpecific: "",
          reasoning: {
            bestOverall: "",
            bestBudget: "",
            bestForSpecific: "",
          },
        },
        comparisons: [],
        insights: [],
      };
    }

    // Sort by rating (highest first)
    const byRating = [...products].sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));

    // Sort by price (lowest first)
    const byPrice = [...products].sort((a, b) => parseFloat(a.price.replace(/[^0-9.]/g, "")) - parseFloat(b.price.replace(/[^0-9.]/g, "")));

    // Best overall = highest rating
    const bestOverall = byRating[0];

    // Best budget = lowest price with decent rating (>= 3.5)
    const budgetCandidates = byPrice.filter((p) => parseFloat(p.rating) >= 3.5);
    const bestBudget = budgetCandidates[0] || byPrice[0];

    // Best for specific = highest review count
    const byReviewCount = [...products].sort((a, b) => parseInt(b.reviewCount) - parseInt(a.reviewCount));
    const bestForSpecific = byReviewCount[0];

    return {
      recommendations: {
        bestOverall: bestOverall.asin,
        bestBudget: bestBudget.asin,
        bestForSpecific: bestForSpecific.asin,
        reasoning: {
          bestOverall: `Highest rated at ${bestOverall.rating}/5 stars with ${bestOverall.reviewCount} reviews`,
          bestBudget: `Most affordable at ${bestBudget.price} with good rating of ${bestBudget.rating}/5`,
          bestForSpecific: `Most popular with ${bestForSpecific.reviewCount} reviews and rating of ${bestForSpecific.rating}/5`,
        },
      },
      comparisons: this.fallbackComparisons(products),
      insights: [
        `Based on analysis of ${products.length} products for "${query}"`,
        `Best overall has ${bestOverall.rating}/5 rating from ${bestOverall.reviewCount} customers`,
        `Best budget option saves money with rating of ${bestBudget.rating}/5`,
      ],
    };
  }

  async generateChatResponse(
    query: string,
    context: {
      products: string[];
      insights: string[];
    }
  ): Promise<string> {
    const prompt = `You are Rufus, an AI shopping assistant. Answer the user's question based on the provided product data.

User Question: "${query}"

Available Products:
${context.products.join("\n\n")}

Key Insights from Reviews:
${context.insights.join("\n")}

IMPORTANT: This is a follow-up conversation. The user is continuing a discussion about the products listed above.

Context Handling:
- If user says "yes", "ok", "sure", "tell me", "show me", etc., they want more details about the products already mentioned
- If user asks for "differences", "compare", "vs", etc., compare the products listed
- If user asks about a specific product from the list, focus on that product
- If user asks for "details", "information", "tell me more", provide specific details about the products

Response Guidelines:
1. For follow-ups (yes/ok/sure): Provide specific details, comparisons, or differences between the products
2. Be specific and mention actual product names, prices, and ratings
3. Include pros/cons and key features from the reviews
4. Maintain conversational context - don't search for new products
5. Keep response to 3-5 sentences but make them detailed and helpful
6. If they want comparisons, highlight key differences between the products

Examples:
- If user says "yes": "Here are the key differences between the options..."
- If user asks "tell me more": "The [Product Name] features include..."
- If user asks for comparisons: "Comparing these options, the main differences are..."`;

    let lastError: any;
    
    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        await this.rateLimit();
        
        const result = await this.model.generateContent(prompt);
        return result.response.text();
      } catch (error: any) {
        lastError = error;
        console.error(`[Gemini] Attempt ${attempt + 1} failed:`, error.message);
        
        // Check if it's a quota/rate limit error
        if (error.status === 429 || error.message?.includes('Too Many Requests')) {
          if (attempt < this.MAX_RETRIES) {
            const retryDelay = this.RATE_LIMIT_DELAY * Math.pow(2, attempt); // Exponential backoff
            console.log(`[Gemini] Rate limited, retrying in ${retryDelay}ms (attempt ${attempt + 1}/${this.MAX_RETRIES + 1})`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            continue;
          }
        }
        
        // For non-quota errors or max retries exceeded, break and use fallback
        break;
      }
    }
    
    console.error("[Gemini] All attempts failed, using fallback response:", lastError?.message);
    return this.fallbackChatResponse(query, context);
  }

  private generateFallbackEmbedding(text: string): number[] {
    const hash = text.split("").reduce((acc, char) => {
      return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
    }, 0);

    const embedding: number[] = [];
    const dimension = config.embeddings.dimension;
    for (let i = 0; i < dimension; i++) {
      const value = Math.sin(hash * (i + 1)) * Math.cos(hash * (i + 2));
      embedding.push(value);
    }

    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map((val) => val / magnitude);
  }

  private fallbackAnalysis(reviews: RawReview[]): {
    pros: string[];
    cons: string[];
    patterns: Array<{ pattern: string; frequency: number; sentiment: string; example: string }>;
    summary: string;
  } {
    const positive = reviews.filter((r) => parseInt(r.rating) >= 4).length;
    const negative = reviews.filter((r) => parseInt(r.rating) <= 2).length;

    return {
      pros: ["Good overall reception", "Positive customer feedback"],
      cons: ["Some mixed reviews"],
      patterns: [
        {
          pattern: "Overall satisfaction",
          frequency: positive,
          sentiment: "positive",
          example: reviews[0]?.content || "N/A",
        },
      ],
      summary: `${positive} positive reviews out of ${reviews.length} total.`,
    };
  }

  private fallbackRecommendations(products: any[]): GeminiResponse {
    if (products.length === 0) {
      return {
        recommendations: {
          bestOverall: "",
          bestBudget: "",
          bestForSpecific: "",
          reasoning: {},
        },
        comparisons: [],
        insights: [],
      };
    }

    const sorted = [...products].sort(
      (a, b) => parseFloat(b.rating || "0") - parseFloat(a.rating || "0")
    );
    const cheapest = [...products].sort(
      (a, b) => parseFloat(a.price?.replace(/[^0-9.]/g, "") || "0") -
        parseFloat(b.price?.replace(/[^0-9.]/g, "") || "0")
    );

    return {
      recommendations: {
        bestOverall: sorted[0]?.asin || "",
        bestBudget: cheapest[0]?.asin || "",
        bestForSpecific: sorted[0]?.asin || "",
        reasoning: {
          bestOverall: "Highest rated product based on customer reviews",
          bestBudget: "Most affordable option available",
          bestForSpecific: "Well-rounded choice for general use",
        },
      },
      comparisons: products.slice(0, 3).map((p) => ({
        asin: p.asin,
        strengths: p.pros.slice(0, 3),
        weaknesses: p.cons.slice(0, 2),
        targetAudience: ["General consumers"],
      })),
      insights: ["Analysis based on available customer reviews"],
    };
  }

  private fallbackChatResponse(query: string, context: any): string {
    try {
      console.log(`[Gemini] Using fallback response for query: "${query}"`);
      console.log(`[Gemini] Context products count: ${context.products?.length || 0}`);
      
      const queryLower = query.toLowerCase();
      const isFollowUp = queryLower === 'yes' || queryLower === 'ok' || queryLower === 'sure' || 
                        queryLower.includes('tell me') || queryLower.includes('show me') ||
                        queryLower.includes('differences') || queryLower.includes('compare') ||
                        queryLower.includes('details') || queryLower.includes('information');
      
      if (isFollowUp && context.products && context.products.length > 0) {
        // Parse all products for comparison
        const products = context.products.map((p: string, index: number) => {
          try {
            const parsed = JSON.parse(p);
            console.log(`[Gemini] Parsed product ${index}:`, parsed.name || 'Unknown');
            return parsed;
          } catch (e) {
            console.log(`[Gemini] Failed to parse product ${index}:`, e);
            return { name: 'Product', price: 'N/A', rating: 'N/A', pros: [], cons: [] };
          }
        });
        
        console.log(`[Gemini] Successfully parsed ${products.length} products for follow-up response`);
        
        if (queryLower === 'yes' || queryLower === 'ok' || queryLower === 'sure') {
          if (products.length >= 2) {
            const p1 = products[0];
            const p2 = products[1];
            return `Here are the key differences: The ${p1.name} at ₹${p1.price.replace('$', '')} (${p1.rating}) offers great value, while the ${p2.name} at ₹${p2.price.replace('$', '')} (${p2.rating}) provides premium features. The ${p1.name} is praised for ${p1.pros?.[0] || 'its quality'}, whereas the ${p2.name} excels at ${p2.pros?.[0] || 'performance'}. Which aspect matters most to you?`;
          } else {
            const p1 = products[0];
            return `The ${p1.name} is priced at ₹${p1.price.replace('$', '')} with a ${p1.rating} rating. Key highlights include ${p1.pros?.slice(0, 2).join(' and ') || 'good quality and value'}. Customers particularly appreciate these features. Would you like to know more about specific aspects or compare it with other options?`;
          }
        }
        
        if (queryLower.includes('differences') || queryLower.includes('compare')) {
          if (products.length >= 2) {
            return `Comparing these options: ${products.map((p: any, i: number) => `${i+1}. ${p.name} - ₹${p.price.replace('$', '')}, ${p.rating}`).join('; ')}. The main differences are in pricing and features - ${products[0].name} focuses on ${products[0].pros?.[0] || 'value'}, while ${products[1].name} emphasizes ${products[1].pros?.[0] || 'performance'}. Each has different strengths depending on your priorities.`;
          }
        }
        
        // Generic follow-up response
        const topProduct = products[0];
        return `Regarding ${topProduct.name} at ₹${topProduct.price.replace('$', '')}: It has a ${topProduct.rating} rating with customers praising ${topProduct.pros?.slice(0, 2).join(' and ') || 'its features and quality'}. This makes it a solid choice for your needs. The other options offer different advantages - would you like me to highlight those comparisons?`;
      }
      
      // Initial query response
      if (context.products && context.products.length > 0) {
        const products = JSON.parse(context.products[0] || '{}');
        const productName = products.name || 'the product';
        const price = products.price || 'Price not available';
        const rating = products.rating || 'Rating not available';
        
        console.log(`[Gemini] Initial query response for: ${productName}`);
        
        return `I found ${context.products.length} relevant products. The top option is ${productName} at ₹${price.replace('$', '')} with ${rating} rating. Reviews indicate good customer satisfaction. Each product offers different features - would you like me to compare the options or provide more details about any specific product?`;
      }
      
      console.log(`[Gemini] No products available in context, using generic response`);
      return `I have several product options available for you. Each has different features, prices, and customer ratings. Would you like me to provide specific details about any particular product or help you compare the options to find the best fit for your needs?`;
    } catch (error) {
      console.error(`[Gemini] Error in fallback response:`, error);
      return `I have several product options available for you. Each has different features, prices, and customer ratings. Would you like me to provide specific details about any particular product or help you compare the options to find the best fit for your needs?`;
    }
  }
}
