/**
 * Local Review Analyzer
 * Analyzes reviews locally without calling LLM
 * Extracts sentiment, pros, cons, and patterns
 */

import { ScrapedReview } from './realTimeScraper';

export interface ReviewInsights {
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number; // -1 to 1
  pros: string[];
  cons: string[];
  commonPhrases: string[];
  averageRating: number;
  verifiedPurchasePercentage: number;
  totalReviews: number;
  ratingDistribution: { [key: number]: number };
}

export class LocalReviewAnalyzer {
  // Positive keywords and phrases
  private positiveIndicators = [
    'good', 'great', 'excellent', 'amazing', 'awesome', 'fantastic', 'wonderful',
    'perfect', 'best', 'love', 'loved', 'like', 'liked', 'recommend', 'happy',
    'satisfied', 'quality', 'value', 'worth', 'fast', 'quick', 'easy', 'smooth',
    'nice', 'beautiful', 'stylish', 'comfortable', 'durable', 'reliable',
    'work', 'works', 'working', 'effective', 'efficient', 'impressed'
  ];

  // Negative keywords and phrases
  private negativeIndicators = [
    'bad', 'worst', 'terrible', 'awful', 'horrible', 'hate', 'hated', 'dislike',
    'disappointed', 'disappointing', 'poor', 'cheap', 'waste', 'wasted', 'broken',
    'defective', 'damaged', 'wrong', 'issue', 'problem', 'problems', 'error',
    'fail', 'failed', 'failure', 'difficult', 'hard', 'slow', 'delay', 'late',
    'missing', 'not', 'dont', "don't", 'never', 'useless', 'fake', 'fraud'
  ];

  // Product-specific pros patterns
  private proPatterns: Record<string, string[]> = {
    quality: ['good quality', 'great quality', 'excellent quality', 'premium quality', 'well made', 'well-built'],
    value: ['value for money', 'worth the price', 'good price', 'affordable', 'reasonable price', 'budget friendly'],
    delivery: ['fast delivery', 'quick shipping', 'arrived early', 'on time', 'well packaged', 'safe packaging'],
    performance: ['works well', 'performs great', 'fast performance', 'smooth operation', 'no lag', 'efficient'],
    design: ['good design', 'beautiful', 'stylish', 'elegant', 'modern', 'sleek', 'attractive'],
    comfort: ['comfortable', 'easy to use', 'user friendly', 'lightweight', 'compact', 'portable'],
    durability: ['durable', 'long lasting', 'sturdy', 'strong', 'well built', 'solid construction'],
  };

  // Product-specific cons patterns
  private conPatterns: Record<string, string[]> = {
    quality: ['poor quality', 'bad quality', 'cheap quality', 'low quality', 'flimsy', 'fragile'],
    value: ['expensive', 'overpriced', 'not worth', 'waste of money', 'costly'],
    delivery: ['late delivery', 'delayed', 'slow shipping', 'damaged in transit', 'poor packaging'],
    performance: ['slow', 'laggy', 'not working', 'stopped working', 'poor performance', 'issues'],
    design: ['bad design', 'ugly', 'old fashioned', 'bulky', 'heavy', 'clumsy'],
    comfort: ['uncomfortable', 'difficult to use', 'complicated', 'heavy', 'not user friendly'],
    durability: ['broke', 'broken', 'not durable', 'short lifespan', 'poor build', 'weak'],
  };

  analyzeReviews(reviews: ScrapedReview[]): ReviewInsights {
    console.log(`[LocalReviewAnalyzer] Analyzing ${reviews.length} reviews`);

    if (reviews.length === 0) {
      return this.getEmptyInsights();
    }

    // Calculate basic stats
    const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    const verifiedCount = reviews.filter(r => r.verified).length;
    const verifiedPercentage = (verifiedCount / reviews.length) * 100;

    // Build rating distribution
    const ratingDistribution: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(r => {
      ratingDistribution[r.rating] = (ratingDistribution[r.rating] || 0) + 1;
    });

    // Analyze sentiment for each review
    let totalSentimentScore = 0;
    const allText = reviews.map(r => `${r.title} ${r.content}`).join(' ').toLowerCase();

    for (const review of reviews) {
      const sentiment = this.analyzeSentiment(review);
      totalSentimentScore += sentiment.score;
    }

    const avgSentimentScore = totalSentimentScore / reviews.length;

    // Extract pros and cons
    const pros = this.extractPros(allText, reviews);
    const cons = this.extractCons(allText, reviews);

    // Extract common phrases
    const commonPhrases = this.extractCommonPhrases(reviews);

    // Determine overall sentiment
    let sentiment: ReviewInsights['sentiment'] = 'neutral';
    if (avgSentimentScore > 0.2) sentiment = 'positive';
    else if (avgSentimentScore < -0.2) sentiment = 'negative';

    const insights: ReviewInsights = {
      sentiment,
      sentimentScore: avgSentimentScore,
      pros: pros.slice(0, 5), // Top 5 pros
      cons: cons.slice(0, 5), // Top 5 cons
      commonPhrases: commonPhrases.slice(0, 5),
      averageRating,
      verifiedPurchasePercentage: verifiedPercentage,
      totalReviews: reviews.length,
      ratingDistribution,
    };

    console.log(`[LocalReviewAnalyzer] Results:`, {
      sentiment: insights.sentiment,
      avgRating: insights.averageRating.toFixed(2),
      pros: insights.pros.length,
      cons: insights.cons.length,
    });

    return insights;
  }

  private analyzeSentiment(review: ScrapedReview): { score: number; label: string } {
    const text = `${review.title} ${review.content}`.toLowerCase();
    
    let positiveCount = 0;
    let negativeCount = 0;

    for (const word of this.positiveIndicators) {
      const regex = new RegExp(`\\b${word}\\b`, 'g');
      const matches = text.match(regex);
      if (matches) positiveCount += matches.length;
    }

    for (const word of this.negativeIndicators) {
      const regex = new RegExp(`\\b${word}\\b`, 'g');
      const matches = text.match(regex);
      if (matches) negativeCount += matches.length;
    }

    // Weight by rating
    const ratingWeight = (review.rating - 3) / 2; // -1 to 1
    
    // Calculate sentiment score (-1 to 1)
    const wordScore = (positiveCount - negativeCount) / Math.max(positiveCount + negativeCount, 1);
    const finalScore = (wordScore * 0.6) + (ratingWeight * 0.4);

    let label = 'neutral';
    if (finalScore > 0.1) label = 'positive';
    else if (finalScore < -0.1) label = 'negative';

    return { score: finalScore, label };
  }

  private extractPros(text: string, reviews: ScrapedReview[]): string[] {
    const pros: { phrase: string; count: number }[] = [];
    const textLower = text.toLowerCase();

    for (const [category, patterns] of Object.entries(this.proPatterns)) {
      for (const pattern of patterns) {
        const regex = new RegExp(`\\b${pattern}\\b`, 'g');
        const matches = textLower.match(regex);
        if (matches && matches.length > 0) {
          pros.push({ phrase: pattern, count: matches.length });
        }
      }
    }

    // Sort by frequency and return unique pros
    return pros
      .sort((a, b) => b.count - a.count)
      .map(p => this.capitalizeFirst(p.phrase))
      .filter((value, index, self) => self.indexOf(value) === index);
  }

  private extractCons(text: string, reviews: ScrapedReview[]): string[] {
    const cons: { phrase: string; count: number }[] = [];
    const textLower = text.toLowerCase();

    for (const [category, patterns] of Object.entries(this.conPatterns)) {
      for (const pattern of patterns) {
        const regex = new RegExp(`\\b${pattern}\\b`, 'g');
        const matches = textLower.match(regex);
        if (matches && matches.length > 0) {
          cons.push({ phrase: pattern, count: matches.length });
        }
      }
    }

    return cons
      .sort((a, b) => b.count - a.count)
      .map(c => this.capitalizeFirst(c.phrase))
      .filter((value, index, self) => self.indexOf(value) === index);
  }

  private extractCommonPhrases(reviews: ScrapedReview[]): string[] {
    const phraseCounts: Map<string, number> = new Map();

    for (const review of reviews) {
      const text = `${review.title} ${review.content}`.toLowerCase();
      const sentences = text.split(/[.!?]+/);

      for (const sentence of sentences) {
        const words = sentence.trim().split(/\s+/).filter(w => w.length > 3);
        
        // Extract 2-3 word phrases
        for (let i = 0; i < words.length - 1; i++) {
          const bigram = `${words[i]} ${words[i + 1]}`;
          phraseCounts.set(bigram, (phraseCounts.get(bigram) || 0) + 1);

          if (i < words.length - 2) {
            const trigram = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
            phraseCounts.set(trigram, (phraseCounts.get(trigram) || 0) + 1);
          }
        }
      }
    }

    // Return phrases that appear at least twice
    return Array.from(phraseCounts.entries())
      .filter(([phrase, count]) => count >= 2 && phrase.length > 8)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([phrase]) => this.capitalizeFirst(phrase));
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private getEmptyInsights(): ReviewInsights {
    return {
      sentiment: 'neutral',
      sentimentScore: 0,
      pros: [],
      cons: [],
      commonPhrases: [],
      averageRating: 0,
      verifiedPurchasePercentage: 0,
      totalReviews: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }

  /**
   * Generate a quick summary of reviews
   */
  generateSummary(insights: ReviewInsights): string {
    const parts: string[] = [];

    // Overall sentiment
    if (insights.sentiment === 'positive') {
      parts.push(`Highly rated with ${insights.averageRating.toFixed(1)}/5 stars`);
    } else if (insights.sentiment === 'negative') {
      parts.push(`Mixed reviews with ${insights.averageRating.toFixed(1)}/5 stars`);
    } else {
      parts.push(`Average rating of ${insights.averageRating.toFixed(1)}/5 stars`);
    }

    // Review count
    parts.push(`based on ${insights.totalReviews} reviews`);

    // Verified purchases
    if (insights.verifiedPurchasePercentage > 50) {
      parts.push(`(${Math.round(insights.verifiedPurchasePercentage)}% verified purchases)`);
    }

    // Top pros
    if (insights.pros.length > 0) {
      parts.push(`Users praise: ${insights.pros.slice(0, 3).join(', ')}`);
    }

    // Top cons
    if (insights.cons.length > 0) {
      parts.push(`Some concerns: ${insights.cons.slice(0, 2).join(', ')}`);
    }

    return parts.join('. ');
  }
}

export const localReviewAnalyzer = new LocalReviewAnalyzer();
