export interface Product {
  id: string;
  asin: string;
  title: string;
  brand: string;
  price: number | null;
  currency: string;
  rating: number;
  reviewCount: number;
  imageUrl: string;
  productUrl: string;
  features: string[];
  description: string;
  category: string;
  scrapedAt: string;
}

export interface Review {
  id: string;
  productId: string;
  asin: string;
  author: string;
  rating: number;
  title: string;
  content: string;
  date: string;
  verified: boolean;
  helpfulVotes: number;
  sentiment?: "positive" | "negative" | "neutral";
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

export interface ProductInsight {
  productId: string;
  asin: string;
  pros: string[];
  cons: string[];
  patterns: PatternInsight[];
  summary: string;
  analyzedAt: string;
}

export interface PatternInsight {
  pattern: string;
  frequency: number;
  sentiment: "positive" | "negative" | "neutral";
  exampleReview: string;
}

export interface ProductInsights {
  pros: string[];
  cons: string[];
  sentiment: string;
  summary: string;
}

export interface ProductDisplay {
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
  insights: ProductInsights;
  reason: string;
  rank: number;
  score: number;
}

export interface TopPick {
  asin: string;
  title: string;
  price: number | null;
  rating: number;
  imageUrl: string;
  url: string;
  reason: string;
}

export interface QueryResult {
  query: string;
  category: string;
  products: ProductDisplay[];
  topRated: TopPick | null;
  bestValue: TopPick | null;
  editorsChoice: TopPick | null;
  summary: string;
  totalProducts: number;
  totalReviews: number;
  averagePrice: number;
  cached: boolean;
}

export interface ProductRecommendation {
  product: Product;
  rank: number;
  score: number;
  reason: string;
  pros: string[];
  cons: string[];
  targetAudience: string[];
  relevantReviews: ReviewChunk[];
}

export interface ProductComparison {
  asin: string;
  title: string;
  price: number | null;
  rating: number;
  strengths: string[];
  weaknesses: string[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  metadata?: {
    products?: ProductDisplay[];
    topRated?: TopPick;
    bestValue?: TopPick;
    editorsChoice?: TopPick;
    summary?: string;
    query?: string;
  };
  recommendations?: QueryResult;
}

export interface SearchRequest {
  query: string;
  maxResults?: number;
}

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
}
