import { Request, Response } from "express";
import { realTimeSearchEngine } from "../services/realTimeSearchEngine";

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

    console.log(`[SearchController] Processing query: "${query}"`);

    // Use the new RealTimeSearchEngine with Apify-first approach
    const result = await realTimeSearchEngine.search({
      query,
      maxResults
    });

    const responseTime = Date.now() - startTime;
    console.log(`[SearchController] Request completed in ${responseTime}ms (from cache: ${result.fromCache})`);

    return res.json({
      success: true,
      data: {
        query: result.query,
        category: result.category,
        products: result.products.map(p => ({
          asin: '',  // Will be populated by scraper
          title: p.title,
          brand: 'Amazon',  // Will be populated by scraper
          price: p.price,
          currency: 'INR',
          rating: p.rating,
          reviewCount: p.reviewCount,
          imageUrl: p.image,
          url: p.url,
          tag: p.tag,
          insights: {
            pros: p.insights.pros,
            cons: p.insights.cons,
            sentiment: 'positive',
            summary: ''
          },
          reason: p.tag || 'Highly rated product',
          rank: 0,
          score: 0
        })),
        topRated: result.topRated,
        bestValue: result.bestValue,
        editorsChoice: result.editorsChoice,
        summary: result.summary,
        totalProducts: result.totalProducts,
        totalReviews: result.totalReviews,
        averagePrice: result.averagePrice,
        cached: result.fromCache
      },
    });
  } catch (error) {
    console.error('[SearchController] Error in searchProducts:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    });
  }
}

// Additional endpoints

export async function getCacheStats(req: Request, res: Response) {
  try {
    const stats = realTimeSearchEngine.getCacheStats();
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
    realTimeSearchEngine.clearCache();
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
