/**
 * RealTimeSearchEngine - Core search engine using real-time scraping
 * Flow: Query -> Category Detection -> Apify Scraper -> Review Fetching -> Local Analysis -> Gemini Summary
 * FAISS is used only as optional cache
 */

import { QueryCategorizer } from './queryCategorizer';
import { recommendationEngine, RecommendationResult } from './recommendationEngine';
import { realTimeScraper, ScrapedReview } from './realTimeScraper';
import { GeminiService } from './gemini';

// Cache for search results (10 minute TTL)
interface CacheEntry {
  result: SearchResult;
  timestamp: number;
}

export interface SearchResult {
  products: {
    title: string;
    price: number | null;
    imageUrl: string;
    url: string;
    rating: number;
    reviewCount: number;
    tag: 'Top Rated' | 'Best Value' | "Editor's Choice" | null;
    insights: {
      pros: string[];
      cons: string[];
    };
  }[];
  summary: string;
  topRated: {
    title: string;
    price: number | null;
    imageUrl: string;
    url: string;
    rating: number;
    reason: string;
  } | null;
  bestValue: {
    title: string;
    price: number | null;
    imageUrl: string;
    url: string;
    rating: number;
    reason: string;
  } | null;
  editorsChoice: {
    title: string;
    price: number | null;
    imageUrl: string;
    url: string;
    rating: number;
    reason: string;
  } | null;
  query: string;
  category: string;
  totalProducts: number;
  totalReviews: number;
  averagePrice: number;
  fromCache: boolean;
}

export class RealTimeSearchEngine {
  private categorizer: QueryCategorizer;
  private gemini: GeminiService;
  private cache: Map<string, CacheEntry>;
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes
  private readonly MAX_RETRIES = 2;

  constructor() {
    this.categorizer = new QueryCategorizer();
    this.gemini = new GeminiService();
    this.cache = new Map();
  }

  /**
   * Main search method - always fetches real-time data
   */
  async search(request: {
    query: string;
    maxResults?: number;
  }): Promise<SearchResult> {
    const { query, maxResults = 10 } = request;
    const startTime = Date.now();

    console.log(`[RealTimeSearchEngine] Starting search for: "${query}"`);

    // Step 1: Check cache
    const cacheKey = this.generateCacheKey(query);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log(`[RealTimeSearchEngine] Cache HIT for query: "${query}"`);
      return { ...cached, fromCache: true };
    }

    // Step 2: Detect category from query
    const categoryResult = this.categorizer.categorize(query);
    console.log(`[RealTimeSearchEngine] Detected category: ${categoryResult.category} (${categoryResult.confidence})`);

    // Step 3: Generate search keywords for Amazon
    const searchKeywords = this.categorizer.generateSearchKeywords(query, categoryResult);
    console.log(`[RealTimeSearchEngine] Search keywords: "${searchKeywords}"`);

    // Step 4: Trigger Apify scraper (with retries)
    let scrapedProducts = await this.scrapeWithRetry(searchKeywords, maxResults);
    
    if (scrapedProducts.length === 0) {
      console.log(`[RealTimeSearchEngine] Apify returned no results, trying fallback`);
      scrapedProducts = await this.fallbackScraping(searchKeywords, maxResults);
    }

    console.log(`[RealTimeSearchEngine] Scraped ${scrapedProducts.length} products`);

    if (scrapedProducts.length === 0) {
      throw new Error('Unable to fetch products. Please try again later.');
    }

    // Step 5: Fetch reviews for top products (limit to top 5 for speed)
    const topProducts = scrapedProducts.slice(0, 5);
    const reviewsMap = await this.fetchReviewsForProducts(topProducts);
    
    // Step 6: Build recommendations using actual reviews
    const recommendationResult = await recommendationEngine.buildRecommendations(
      scrapedProducts,
      reviewsMap
    );

    // Step 7: Generate summary with Gemini (only for final response)
    const summary = await this.generateSummary(query, recommendationResult);

    // Step 8: Build final response
    const result = this.buildResponse(query, categoryResult.category, recommendationResult, summary);

    // Step 9: Cache the result
    this.addToCache(cacheKey, result);

    const duration = Date.now() - startTime;
    console.log(`[RealTimeSearchEngine] Search complete in ${duration}ms`);

    return { ...result, fromCache: false };
  }

  /**
   * Scrape products from Amazon using Apify with retry
   */
  private async scrapeWithRetry(keywords: string, maxResults: number): Promise<any[]> {
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        console.log(`[RealTimeSearchEngine] Apify attempt ${attempt}/${this.MAX_RETRIES}`);
        
        // Use realTimeScraper which calls Apify
        const products = await realTimeScraper.scrapeProducts(keywords, maxResults);
        
        if (products.length > 0) {
          console.log(`[RealTimeSearchEngine] Apify success: ${products.length} products`);
          return products;
        }
        
        console.log(`[RealTimeSearchEngine] Apify returned 0 products, retrying...`);
        await this.delay(2000 * attempt); // Exponential backoff
      } catch (error) {
        console.error(`[RealTimeSearchEngine] Apify attempt ${attempt} failed:`, error);
        if (attempt < this.MAX_RETRIES) {
          await this.delay(2000 * attempt);
        }
      }
    }
    
    return [];
  }

  /**
   * Fallback scraping using axios + cheerio
   */
  private async fallbackScraping(keywords: string, maxResults: number): Promise<any[]> {
    console.log(`[RealTimeSearchEngine] Using fallback HTML scraping`);
    
    try {
      // Use realTimeScraper's HTML fallback
      return await realTimeScraper.scrapeProductsFallback(keywords, maxResults);
    } catch (error) {
      console.error(`[RealTimeSearchEngine] Fallback scraping failed:`, error);
      return [];
    }
  }

  /**
   * Fetch reviews for top products
   */
  private async fetchReviewsForProducts(products: any[]): Promise<Map<string, ScrapedReview[]>> {
    const reviewsMap = new Map<string, ScrapedReview[]>();
    
    console.log(`[RealTimeSearchEngine] Fetching reviews for ${products.length} products`);
    
    for (const product of products) {
      try {
        if (!product.asin) {
          console.log(`[RealTimeSearchEngine] Skipping ${product.title} - no ASIN available`);
          reviewsMap.set(product.asin || 'unknown', []);
          continue;
        }
        
        console.log(`[RealTimeSearchEngine] Fetching reviews for ${product.title} (ASIN: ${product.asin})`);
        
        // Fetch 20-50 reviews per product
        const reviews = await realTimeScraper.scrapeReviews(product.asin, 30);
        console.log(`[RealTimeSearchEngine] Got ${reviews.length} reviews for ${product.asin}`);
        
        reviewsMap.set(product.asin, reviews);
        
        // Small delay to avoid rate limiting
        await this.delay(500);
      } catch (error) {
        console.error(`[RealTimeSearchEngine] Failed to fetch reviews for ${product.asin}:`, error);
        reviewsMap.set(product.asin, []);
      }
    }
    
    const totalReviews = Array.from(reviewsMap.values()).reduce((sum, r) => sum + r.length, 0);
    console.log(`[RealTimeSearchEngine] Total reviews fetched: ${totalReviews} across ${reviewsMap.size} products`);
    
    return reviewsMap;
  }

  /**
   * Generate summary using Gemini (only for final response)
   */
  private async generateSummary(query: string, recommendations: RecommendationResult): Promise<string> {
    try {
      const topProducts = recommendations.products.slice(0, 5).map(p => ({
        title: p.product.title,
        price: p.product.price,
        rating: p.product.rating,
        reviewCount: p.reviews.length, // Use actual fetched reviews
        pros: p.insights.pros.slice(0, 3),
        cons: p.insights.cons.slice(0, 2),
        tag: p.tag
      }));

      const prompt = `Based on the user's query "${query}", here are the top products I found:

${topProducts.map((p, i) => `${i + 1}. ${p.title}
   Rating: ${p.rating}/5 (${p.reviewCount} reviews)
   Price: ₹${p.price}
   ${p.tag ? `Tag: ${p.tag}` : ''}
   Pros: ${p.pros.join(', ')}
   Cons: ${p.cons.join(', ')}`).join('\n\n')}

Write a helpful 2-3 sentence summary that:
1. Acknowledges the user's query
2. Mentions the top-rated option with specific rating and review count
3. Mentions the best value option with price
4. Gives one key recommendation

Keep it natural and conversational. Include specific numbers.`;

      const response = await this.gemini.generateText(prompt);
      return response || this.generateRuleBasedSummary(topProducts, query);
    } catch (error) {
      console.error('[RealTimeSearchEngine] Gemini summary failed, using rule-based:', error);
      return this.generateRuleBasedSummary(recommendations.products.slice(0, 5), query);
    }
  }

  /**
   * Generate rule-based summary when Gemini fails
   */
  private generateRuleBasedSummary(products: any[], query: string): string {
    if (products.length === 0) {
      return `I couldn't find products for "${query}". Please try a different search.`;
    }

    const topRated = products[0];
    const bestValue = products.find(p => p.tag === 'Best Value') || products[1] || topRated;

    let summary = `Based on your search for "${query}", `;
    
    if (topRated) {
      const reviewCount = topRated.reviews?.length || topRated.product?.reviewCount || 0;
      summary += `the ${topRated.product.title} stands out with an excellent ${topRated.product.rating}/5 star rating based on ${reviewCount.toLocaleString()} customer reviews. `;
    }
    
    if (bestValue && bestValue !== topRated) {
      summary += `For the best value, consider the ${bestValue.product.title} at ₹${bestValue.product.price} with a ${bestValue.product.rating}/5 rating. `;
    }
    
    summary += `All options have been analyzed from recent customer feedback to help you make the best choice.`;

    return summary;
  }

  /**
   * Build final response in required format
   */
  private buildResponse(
    query: string,
    category: string,
    recommendations: RecommendationResult,
    summary: string
  ): SearchResult {
    return {
      products: recommendations.products.map(p => ({
        title: p.product.title,
        price: p.product.price,
        imageUrl: p.product.imageUrl || '',
        url: p.product.productUrl,
        rating: p.product.rating,
        reviewCount: p.reviews.length, // Use actual fetched reviews count
        tag: p.tag,
        insights: {
          pros: p.insights.pros.slice(0, 3),
          cons: p.insights.cons.slice(0, 3)
        }
      })),
      summary,
      topRated: recommendations.topRated ? {
        title: recommendations.topRated.product.title,
        price: recommendations.topRated.product.price,
        imageUrl: recommendations.topRated.product.imageUrl || '',
        url: recommendations.topRated.product.productUrl,
        rating: recommendations.topRated.product.rating,
        reason: recommendations.topRated.reason
      } : null,
      bestValue: recommendations.bestValue ? {
        title: recommendations.bestValue.product.title,
        price: recommendations.bestValue.product.price,
        imageUrl: recommendations.bestValue.product.imageUrl || '',
        url: recommendations.bestValue.product.productUrl,
        rating: recommendations.bestValue.product.rating,
        reason: recommendations.bestValue.reason
      } : null,
      editorsChoice: recommendations.editorsChoice ? {
        title: recommendations.editorsChoice.product.title,
        price: recommendations.editorsChoice.product.price,
        imageUrl: recommendations.editorsChoice.product.imageUrl || '',
        url: recommendations.editorsChoice.product.productUrl,
        rating: recommendations.editorsChoice.product.rating,
        reason: recommendations.editorsChoice.reason
      } : null,
      query,
      category,
      totalProducts: recommendations.products.length,
      totalReviews: recommendations.totalReviews,
      averagePrice: recommendations.averagePrice,
      fromCache: false
    };
  }

  /**
   * Cache management
   */
  private generateCacheKey(query: string): string {
    return `search:${query.toLowerCase().trim()}`;
  }

  private getFromCache(key: string): SearchResult | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.result;
  }

  private addToCache(key: string, result: SearchResult): void {
    this.cache.set(key, {
      result,
      timestamp: Date.now()
    });

    // Cleanup old entries if cache too large
    if (this.cache.size > 100) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('[RealTimeSearchEngine] Cache cleared');
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const realTimeSearchEngine = new RealTimeSearchEngine();
