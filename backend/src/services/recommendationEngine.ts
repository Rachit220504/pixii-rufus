/**
 * Recommendation Engine
 * Ranks products and assigns tags (Top Rated, Best Value, Editor's Choice)
 * Based on rating, price, reviews, and sentiment
 */

import { ScrapedProduct, ScrapedReview } from './realTimeScraper';
import { ReviewInsights, localReviewAnalyzer } from './localReviewAnalyzer';

export interface ProductRecommendation {
  product: ScrapedProduct;
  reviews: ScrapedReview[];
  insights: ReviewInsights;
  rank: number;
  score: number;
  tag: 'Top Rated' | 'Best Value' | "Editor's Choice" | null;
  reason: string;
}

export interface RecommendationResult {
  products: ProductRecommendation[];
  topRated: ProductRecommendation | null;
  bestValue: ProductRecommendation | null;
  editorsChoice: ProductRecommendation | null;
  totalReviews: number;
  averagePrice: number;
}

export class RecommendationEngine {
  /**
   * Build recommendations from products and reviews
   */
  async buildRecommendations(
    products: ScrapedProduct[],
    reviewsMap: Map<string, ScrapedReview[]>
  ): Promise<RecommendationResult> {
    console.log(`[RecommendationEngine] Building recommendations for ${products.length} products`);

    // Analyze each product
    const analyzedProducts: ProductRecommendation[] = [];

    for (const product of products) {
      const reviews = reviewsMap.get(product.asin) || [];
      const insights = localReviewAnalyzer.analyzeReviews(reviews);

      // Calculate recommendation score
      const score = this.calculateScore(product, insights);

      analyzedProducts.push({
        product,
        reviews,
        insights,
        rank: 0, // Will be set after sorting
        score,
        tag: null, // Will be assigned
        reason: this.generateReason(product, insights),
      });
    }

    // Sort by score (descending)
    analyzedProducts.sort((a, b) => b.score - a.score);

    // Assign ranks
    analyzedProducts.forEach((p, index) => {
      p.rank = index + 1;
    });

    // Assign tags to top products
    const result = this.assignTags(analyzedProducts);

    // Calculate summary stats
    const totalReviews = analyzedProducts.reduce((sum, p) => sum + p.reviews.length, 0);
    const productsWithPrice = analyzedProducts.filter(p => p.product.price !== null);
    const averagePrice = productsWithPrice.length > 0
      ? productsWithPrice.reduce((sum, p) => sum + (p.product.price || 0), 0) / productsWithPrice.length
      : 0;

    console.log(`[RecommendationEngine] Complete:`, {
      totalProducts: result.products.length,
      topRated: result.topRated?.product.title || 'None',
      bestValue: result.bestValue?.product.title || 'None',
      editorsChoice: result.editorsChoice?.product.title || 'None',
      totalReviews,
      averagePrice: Math.round(averagePrice),
    });

    return {
      ...result,
      totalReviews,
      averagePrice,
    };
  }

  /**
   * Calculate recommendation score for a product
   */
  private calculateScore(product: ScrapedProduct, insights: ReviewInsights): number {
    let score = 0;

    // Rating component (0-40 points)
    // 5 stars = 40 points, 4 stars = 32 points, etc.
    score += (product.rating / 5) * 40;

    // Review count component (0-20 points)
    // More reviews = more confidence, up to 100 reviews
    const reviewCountScore = Math.min(product.reviewCount / 100, 1) * 20;
    score += reviewCountScore;

    // Sentiment component (0-25 points)
    // Positive sentiment adds points, negative subtracts
    score += (insights.sentimentScore + 1) / 2 * 25;

    // Price component (0-15 points)
    // Lower price = better value, but not if quality is poor
    if (product.price !== null && product.price > 0) {
      // Normalize price (assuming range 0-100000 INR)
      const priceScore = Math.max(0, 1 - (product.price / 100000)) * 15;
      score += priceScore;
    }

    // Verified purchase bonus (up to 10 points)
    score += (insights.verifiedPurchasePercentage / 100) * 10;

    return Math.round(score * 100) / 100;
  }

  /**
   * Generate reason text for recommendation
   */
  private generateReason(product: ScrapedProduct, insights: ReviewInsights): string {
    const parts: string[] = [];

    // Rating
    if (product.rating >= 4.5) {
      parts.push(`Excellent ${product.rating}/5 star rating`);
    } else if (product.rating >= 4.0) {
      parts.push(`Very good ${product.rating}/5 star rating`);
    } else if (product.rating >= 3.5) {
      parts.push(`Good ${product.rating}/5 star rating`);
    }

    // Review count
    if (product.reviewCount >= 1000) {
      parts.push(`trusted by ${product.reviewCount.toLocaleString()}+ customers`);
    } else if (product.reviewCount >= 100) {
      parts.push(`${product.reviewCount.toLocaleString()}+ reviews`);
    }

    // Sentiment
    if (insights.sentiment === 'positive' && insights.pros.length > 0) {
      parts.push(`praised for ${insights.pros[0]}`);
    }

    return parts.join('. ') || 'Available in this category';
  }

  /**
   * Assign tags to top products
   */
  private assignTags(products: ProductRecommendation[]): RecommendationResult {
    const result: RecommendationResult = {
      products: [...products],
      topRated: null,
      bestValue: null,
      editorsChoice: null,
      totalReviews: 0,
      averagePrice: 0,
    };

    if (products.length === 0) return result;

    // Find Top Rated (highest rating with minimum reviews)
    const minReviewsForTopRated = 10;
    const eligibleForTopRated = products.filter(
      p => p.product.reviewCount >= minReviewsForTopRated
    );

    if (eligibleForTopRated.length > 0) {
      // Sort by rating first, then by review count
      eligibleForTopRated.sort((a, b) => {
        if (b.product.rating !== a.product.rating) {
          return b.product.rating - a.product.rating;
        }
        return b.product.reviewCount - a.product.reviewCount;
      });

      result.topRated = eligibleForTopRated[0];
      result.topRated.tag = 'Top Rated';
    }

    // Find Best Value (good rating at lowest price)
    const minRatingForBestValue = 3.5;
    const eligibleForBestValue = products.filter(
      p => p.product.rating >= minRatingForBestValue && p.product.price !== null && p.product.price > 0
    );

    if (eligibleForBestValue.length > 0) {
      // Calculate value score (rating / price)
      eligibleForBestValue.sort((a, b) => {
        const valueA = a.product.rating / Math.max(a.product.price || 1, 1);
        const valueB = b.product.rating / Math.max(b.product.price || 1, 1);
        return valueB - valueA;
      });

      // Pick different product than topRated if possible
      const bestValueCandidate = eligibleForBestValue.find(
        p => p.product.asin !== result.topRated?.product.asin
      ) || eligibleForBestValue[0];

      if (bestValueCandidate) {
        result.bestValue = bestValueCandidate;
        result.bestValue.tag = 'Best Value';
      }
    }

    // Find Editor's Choice (best overall score)
    // Must be different from other picks
    const eligibleForEditorsChoice = products.filter(
      p => p.product.asin !== result.topRated?.product.asin &&
           p.product.asin !== result.bestValue?.product.asin
    );

    if (eligibleForEditorsChoice.length > 0) {
      // Already sorted by score
      result.editorsChoice = eligibleForEditorsChoice[0];
      result.editorsChoice.tag = "Editor's Choice";
    } else if (products.length > 2) {
      // If all products taken, pick the next best
      result.editorsChoice = products[2];
      result.editorsChoice.tag = "Editor's Choice";
    }

    // Ensure all products have proper tags in the list
    result.products = products.map(p => {
      if (p.product.asin === result.topRated?.product.asin) {
        return { ...p, tag: 'Top Rated' as const };
      }
      if (p.product.asin === result.bestValue?.product.asin) {
        return { ...p, tag: 'Best Value' as const };
      }
      if (p.product.asin === result.editorsChoice?.product.asin) {
        return { ...p, tag: "Editor's Choice" as const };
      }
      return p;
    });

    return result;
  }

  /**
   * Get alternative recommendations
   */
  getAlternatives(
    product: ProductRecommendation,
    allProducts: ProductRecommendation[],
    count: number = 3
  ): ProductRecommendation[] {
    // Find similar products (same category, different price range)
    return allProducts
      .filter(p => 
        p.product.asin !== product.product.asin &&
        p.product.category === product.product.category
      )
      .sort((a, b) => {
        // Prefer products with similar rating but different price
        const aRatingDiff = Math.abs(a.product.rating - product.product.rating);
        const bRatingDiff = Math.abs(b.product.rating - product.product.rating);
        
        if (aRatingDiff !== bRatingDiff) {
          return aRatingDiff - bRatingDiff;
        }
        
        // Then by score
        return b.score - a.score;
      })
      .slice(0, count);
  }
}

export const recommendationEngine = new RecommendationEngine();
