export interface RawProduct {
  asin: string;
  title: string;
  brand?: string;
  price?: string;
  rating?: string;
  reviewCount?: string;
  imageUrl?: string;
  productUrl?: string;
  features?: string[];
  description?: string;
  category?: string;
}

export interface RawReview {
  reviewId: string;
  author: string;
  rating: string;
  title: string;
  content: string;
  date: string;
  verified?: boolean;
  helpfulVotes?: string;
}

export interface ScrapedData {
  product: RawProduct;
  reviews: RawReview[];
  scrapedAt: string;
}

export interface GeminiConfig {
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface EmbeddingConfig {
  dimension: number;
  model: string;
}

export interface VectorSearchResult {
  id: string;
  distance: number;
  metadata: Record<string, any>;
}

export interface GeminiResponse {
  recommendations: {
    bestOverall?: string;
    bestBudget?: string;
    bestForSpecific?: string;
    reasoning: Record<string, string>;
  };
  comparisons: Array<{
    asin: string;
    strengths: string[];
    weaknesses: string[];
    targetAudience: string[];
  }>;
  insights: string[];
}

export interface ReviewChunk {
  id: string;
  productId: string;
  asin: string;
  content: string;
  embedding?: number[];
  metadata: {
    reviewId: string;
    rating: number;
    sentiment: string;
    keywords: string[];
  };
}
