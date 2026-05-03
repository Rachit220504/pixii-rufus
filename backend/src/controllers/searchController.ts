import { Request, Response } from "express";
import { queryAnalyzer } from "../services/queryAnalyzer";
import { realTimeScraper, ScrapedProduct, ScrapedReview } from "../services/realTimeScraper";
import { localReviewAnalyzer, ReviewInsights } from "../services/localReviewAnalyzer";
import { recommendationEngine, ProductRecommendation, RecommendationResult } from "../services/recommendationEngine";
import { queryCache } from "../services/queryCache";
import { GeminiService } from "../services/gemini";

const geminiService = new GeminiService();

export interface SearchResult {
  success: boolean;
  data?: {
    query: string;
    category: string;
    products: Array<{
      asin: string;
      title: string;
      brand: string;
      price: number | null;
      currency: string;
      rating: number;
      reviewCount: number;
      imageUrl: string;
      url: string;
      tag: string | null;
      insights: {
        pros: string[];
        cons: string[];
        sentiment: string;
        summary: string;
      };
      reason: string;
      rank: number;
      score: number;
    }>;
    topRated: any | null;
    bestValue: any | null;
    editorsChoice: any | null;
    summary: string;
    totalProducts: number;
    totalReviews: number;
    averagePrice: number;
    cached: boolean;
  };
  error?: string;
}

export async function searchProducts(req: Request, res: Response) {
  const startTime = Date.now();
  
  try {
    const { query, maxResults = 10 } = req.body;

    if (!query || typeof query !== "string") {
      return res.status(400).json({
        success: false,
        error: "Query is required and must be a string",
      });
    }

    console.log(`\n========================================`);
    console.log(`[SearchController] NEW SEARCH: "${query}"`);
    console.log(`========================================\n`);

    // STEP 1: Check cache
    const cacheKey = queryCache.generateKey(query);
    const cached = queryCache.get<SearchResult['data']>(cacheKey);
    
    if (cached) {
      console.log(`[SearchController] Returning cached result`);
      return res.json({
        success: true,
        data: { ...cached, cached: true },
      });
    }

    // STEP 2: Analyze query
    const analysis = queryAnalyzer.analyze(query);
    console.log(`[SearchController] Query analysis:`, {
      category: analysis.category,
      keywords: analysis.searchKeywords,
      intent: analysis.intent,
    });

    // STEP 3: Generate search terms for Amazon
    const searchTerm = queryAnalyzer.generateAmazonSearchTerms(analysis);
    console.log(`[SearchController] Amazon search term: "${searchTerm}"`);

    // STEP 4: Scrape real-time products from Amazon
    console.log(`[SearchController] STEP 1: Scraping products...`);
    let products: ScrapedProduct[] = [];
    
    try {
      products = await realTimeScraper.searchProducts(searchTerm, maxResults);
      console.log(`[SearchController] Scraped ${products.length} products`);
      
      if (products.length === 0) {
        throw new Error('No products found from scraper');
      }
    } catch (scrapeError) {
      console.error(`[SearchController] Scraping failed:`, scrapeError);
      return res.status(500).json({
        success: false,
        error: "Unable to fetch products. Please try again.",
      });
    }

    // Apply price filters from query analysis
    if (analysis.filters.maxPrice !== undefined) {
      const beforeCount = products.length;
      products = products.filter(p => p.price === null || p.price <= analysis.filters.maxPrice!);
      console.log(`[SearchController] Price filter applied (max ₹${analysis.filters.maxPrice}): ${beforeCount} → ${products.length} products`);
    }
    if (analysis.filters.minPrice !== undefined) {
      const beforeCount = products.length;
      products = products.filter(p => p.price === null || p.price >= analysis.filters.minPrice!);
      console.log(`[SearchController] Price filter applied (min ₹${analysis.filters.minPrice}): ${beforeCount} → ${products.length} products`);
    }

    // Log first few products
    products.slice(0, 3).forEach((p, i) => {
      const priceDisplay = p.price !== null ? `₹${p.price}` : 'Price unavailable';
      console.log(`[SearchController] Product ${i + 1}: ${p.title.substring(0, 60)}... (${priceDisplay})`);
    });

    // STEP 5: Fetch reviews for top 5 products
    console.log(`[SearchController] STEP 2: Fetching reviews...`);
    const reviewsMap = new Map<string, ScrapedReview[]>();
    
    for (const product of products.slice(0, 5)) {
      try {
        const reviews = await realTimeScraper.fetchReviews(product.asin, 25);
        reviewsMap.set(product.asin, reviews);
        console.log(`[SearchController] ${product.asin}: ${reviews.length} reviews`);
      } catch (error) {
        console.warn(`[SearchController] Failed to fetch reviews for ${product.asin}:`, error);
        reviewsMap.set(product.asin, []);
      }
    }

    // STEP 6: Build recommendations
    console.log(`[SearchController] STEP 3: Building recommendations...`);
    const recommendations = await recommendationEngine.buildRecommendations(
      products,
      reviewsMap
    );

    // STEP 7: Generate AI summary (optional - call Gemini)
    console.log(`[SearchController] STEP 4: Generating summary...`);
    let summary = '';
    
    try {
      summary = await generateAISummary(query, analysis.category, recommendations);
    } catch (error) {
      console.warn(`[SearchController] Gemini failed, using rule-based summary:`, error);
      summary = generateRuleBasedSummary(query, recommendations);
    }

    // STEP 8: Format response
    const responseData: SearchResult['data'] = {
      query,
      category: analysis.category,
      products: recommendations.products.map(p => ({
        asin: p.product.asin,
        title: p.product.title,
        brand: p.product.brand,
        price: p.product.price,
        currency: p.product.currency,
        rating: p.product.rating,
        reviewCount: p.product.reviewCount,
        imageUrl: p.product.imageUrl,
        url: p.product.productUrl,
        tag: p.tag,
        insights: {
          pros: p.insights.pros.slice(0, 3),
          cons: p.insights.cons.slice(0, 3),
          sentiment: p.insights.sentiment,
          summary: localReviewAnalyzer.generateSummary(p.insights),
        },
        reason: p.reason,
        rank: p.rank,
        score: p.score,
      })),
      topRated: recommendations.topRated ? {
        asin: recommendations.topRated.product.asin,
        title: recommendations.topRated.product.title,
        price: recommendations.topRated.product.price,
        rating: recommendations.topRated.product.rating,
        imageUrl: recommendations.topRated.product.imageUrl,
        url: recommendations.topRated.product.productUrl,
        reason: recommendations.topRated.reason,
      } : null,
      bestValue: recommendations.bestValue ? {
        asin: recommendations.bestValue.product.asin,
        title: recommendations.bestValue.product.title,
        price: recommendations.bestValue.product.price,
        rating: recommendations.bestValue.product.rating,
        imageUrl: recommendations.bestValue.product.imageUrl,
        url: recommendations.bestValue.product.productUrl,
        reason: recommendations.bestValue.reason,
      } : null,
      editorsChoice: recommendations.editorsChoice ? {
        asin: recommendations.editorsChoice.product.asin,
        title: recommendations.editorsChoice.product.title,
        price: recommendations.editorsChoice.product.price,
        rating: recommendations.editorsChoice.product.rating,
        imageUrl: recommendations.editorsChoice.product.imageUrl,
        url: recommendations.editorsChoice.product.productUrl,
        reason: recommendations.editorsChoice.reason,
      } : null,
      summary,
      totalProducts: recommendations.products.length,
      totalReviews: recommendations.totalReviews,
      averagePrice: Math.round(recommendations.averagePrice),
      cached: false,
    };

    // Cache the result
    queryCache.set(cacheKey, responseData);

    const duration = Date.now() - startTime;
    console.log(`[SearchController] Search complete in ${duration}ms`);
    console.log(`========================================\n`);

    return res.json({
      success: true,
      data: responseData,
    });

  } catch (error) {
    console.error("[SearchController] Search error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Search failed",
    });
  }
}

/**
 * Generate AI-powered summary using Gemini
 */
async function generateAISummary(
  query: string,
  category: string,
  recommendations: RecommendationResult
): Promise<string> {
  const topProducts = recommendations.products.slice(0, 3);
  
  const prompt = `You are a helpful shopping assistant. A user searched for "${query}" in the ${category} category.

Based on real Amazon product data, here are the top recommendations:

${topProducts.map((p, i) => `${i + 1}. ${p.product.title}
   - Price: ${p.product.price !== null ? `₹${p.product.price}` : 'Currently unavailable'}
   - Rating: ${p.product.rating}/5 (${p.product.reviewCount} reviews)
   - ${p.reason}
   - Pros: ${p.insights.pros.slice(0, 2).join(', ') || 'N/A'}
   - Cons: ${p.insights.cons.slice(0, 2).join(', ') || 'N/A'}`).join('\n\n')}

Write a helpful 2-3 sentence summary for the user. Include specific product names, ratings, and price comparisons. Be conversational but informative. Mention the top pick and best value option.`;

  try {
    const result = await geminiService.generateText(prompt);
    if (result) {
      // Remove markdown ** syntax - use plain text
      return result.replace(/\*\*(.+?)\*\*/g, '$1');
    } else {
      console.warn('[SearchController] Gemini returned null, using rule-based summary');
      return generateRuleBasedSummary(query, recommendations);
    }
  } catch (error) {
    console.warn('[SearchController] Gemini summary failed:', error);
    console.log('[SearchController] Falling back to rule-based summary');
    return generateRuleBasedSummary(query, recommendations);
  }
}

/**
 * Generate rule-based summary when Gemini fails
 */
function generateRuleBasedSummary(
  query: string,
  recommendations: RecommendationResult
): string {
  const parts: string[] = [];
  
  parts.push(`I found ${recommendations.products.length} ${recommendations.products[0]?.product.category || 'products'} for your search.`);
  
  if (recommendations.topRated) {
    parts.push(`The top-rated option is ${recommendations.topRated.product.title} with ${recommendations.topRated.product.rating}/5 stars.`);
  }
  
  if (recommendations.bestValue && recommendations.bestValue.product.price !== null) {
    parts.push(`For best value, check out ${recommendations.bestValue.product.title} at ₹${recommendations.bestValue.product.price}.`);
  } else if (recommendations.bestValue) {
    parts.push(`For best value, check out ${recommendations.bestValue.product.title}.`);
  }
  
  if (recommendations.editorsChoice) {
    parts.push(`My top recommendation is ${recommendations.editorsChoice.product.title}.`);
  }
  
  return parts.join(' ');
}

// Additional endpoints for the new architecture

export async function getCacheStats(req: Request, res: Response) {
  try {
    const stats = queryCache.getStats();
    return res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Cache stats error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to get cache stats",
    });
  }
}

export async function clearCache(req: Request, res: Response) {
  try {
    queryCache.clear();
    return res.json({
      success: true,
      message: "Cache cleared successfully",
    });
  } catch (error) {
    console.error("Clear cache error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to clear cache",
    });
  }
}
