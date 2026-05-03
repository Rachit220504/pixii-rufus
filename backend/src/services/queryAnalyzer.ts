/**
 * Query Analyzer Service
 * Extracts product category and intent from natural language queries
 */

export interface QueryAnalysis {
  originalQuery: string;
  category: string;
  searchKeywords: string;
  intent: 'purchase' | 'research' | 'comparison' | 'general';
  filters: {
    minRating?: number;
    maxPrice?: number;
    minPrice?: number;
    brand?: string;
  };
}

export class QueryAnalyzer {
  // Common filler words to remove
  private fillerWords = new Set([
    'i', 'want', 'wanted', 'to', 'buy', 'a', 'an', 'the', 'looking', 'for',
    'find', 'get', 'purchase', 'need', 'search', 'best', 'top', 'good',
    'great', 'recommend', 'suggest', 'help', 'me', 'my', 'please', 'can',
    'you', 'show', 'some', 'what', 'which', 'where', 'how', 'is', 'are',
    'would', 'like', 'something', 'under', 'around', 'about', 'with', 'and',
    'or', 'but', 'in', 'on', 'at', 'of', 'by', 'that', 'this', 'these', 'those'
  ]);

  // Category patterns with keywords
  private categoryPatterns: Record<string, string[]> = {
    'tv': ['tv', 'television', 'smart tv', 'led tv', 'oled', 'qled', '4k tv', '8k tv', 'android tv'],
    'mobile': ['mobile', 'phone', 'smartphone', 'cell phone', 'iphone', 'android', 'samsung', 'xiaomi'],
    'laptop': ['laptop', 'notebook', 'computer', 'macbook', 'chromebook', 'gaming laptop'],
    'keyboard': ['keyboard', 'mechanical keyboard', 'gaming keyboard', 'wireless keyboard'],
    'mouse': ['mouse', 'gaming mouse', 'wireless mouse', 'bluetooth mouse'],
    'watch': ['watch', 'watches', 'smartwatch', 'wristwatch', 'apple watch', 'fitness tracker'],
    'headphones': ['headphones', 'earphones', 'earbuds', 'airpods', 'wireless headphones', 'bluetooth headphones'],
    'camera': ['camera', 'dslr', 'mirrorless', 'gopro', 'action camera', 'webcam'],
    'shoes': ['shoes', 'sneakers', 'running shoes', 'casual shoes', 'formal shoes', 'boots'],
    'shirt': ['shirt', 'tshirt', 't-shirt', 'formal shirt', 'casual shirt', 'polo'],
    'dress': ['dress', 'gown', 'party dress', 'casual dress', 'evening dress'],
    'bag': ['bag', 'backpack', 'handbag', 'laptop bag', 'sling bag', 'tote bag'],
    'jewelry': ['jewelry', 'jewellery', 'necklace', 'earrings', 'ring', 'bracelet', 'pendant'],
    'makeup': ['makeup', 'cosmetics', 'lipstick', 'foundation', 'mascara', 'eyeliner'],
    'skincare': ['skincare', 'moisturizer', 'serum', 'sunscreen', 'face wash', 'cleanser'],
    'supplement': ['supplement', 'vitamin', 'protein', 'magnesium', 'omega', 'multivitamin'],
    'furniture': ['furniture', 'sofa', 'chair', 'table', 'bed', 'mattress', 'wardrobe'],
    'appliance': ['appliance', 'refrigerator', 'washing machine', 'microwave', 'oven', 'ac', 'air conditioner'],
    'book': ['book', 'novel', 'textbook', 'ebook', 'audiobook', 'hardcover'],
    'toy': ['toy', 'games', 'puzzle', 'action figure', 'doll', 'lego', 'board game'],
    'sports': ['sports', 'fitness', 'gym', 'yoga', 'exercise', 'workout', 'protein powder'],
    'kitchen': ['kitchen', 'cookware', 'utensil', 'appliance', 'blender', 'mixer', 'air fryer'],
    'beauty': ['beauty', 'personal care', 'hair care', 'shampoo', 'conditioner', 'body wash'],
    'electronics': ['electronics', 'gadget', 'device', 'electronic', 'digital'],
    'home': ['home', 'decor', 'interior', 'curtain', 'cushion', 'vase', 'wall art'],
    'car': ['car', 'automotive', 'vehicle', 'tire', 'accessory', 'car cover', 'seat cover'],
    'bike': ['bike', 'bicycle', 'cycle', 'mountain bike', 'road bike', 'electric bike'],
    'baby': ['baby', 'toddler', 'infant', 'newborn', 'diaper', 'stroller', 'toys'],
    'pet': ['pet', 'dog', 'cat', 'pet food', 'pet toy', 'leash', 'collar'],
    'gift': ['gift', 'present', 'birthday', 'anniversary', 'special occasion']
  };

  // Intent keywords
  private intentPatterns = {
    purchase: ['buy', 'purchase', 'order', 'get', 'shop', 'want', 'need', 'looking for'],
    research: ['compare', 'difference', 'vs', 'versus', 'which', 'what', 'how', 'review'],
    comparison: ['best', 'top', 'better', 'compare', 'vs', 'versus', 'difference between'],
  };

  analyze(query: string): QueryAnalysis {
    const normalizedQuery = query.toLowerCase().trim();
    
    // Extract category
    const category = this.extractCategory(normalizedQuery);
    
    // Extract search keywords (cleaned)
    const searchKeywords = this.extractSearchKeywords(normalizedQuery, category);
    
    // Detect intent
    const intent = this.detectIntent(normalizedQuery);
    
    // Extract filters
    const filters = this.extractFilters(normalizedQuery);

    return {
      originalQuery: query,
      category,
      searchKeywords,
      intent,
      filters
    };
  }

  private extractCategory(query: string): string {
    let bestMatch: string | null = null;
    let maxScore = 0;

    for (const [category, keywords] of Object.entries(this.categoryPatterns)) {
      let score = 0;
      for (const keyword of keywords) {
        if (query.includes(keyword)) {
          // Longer keyword matches get higher score (more specific)
          score += keyword.length;
        }
      }
      
      if (score > maxScore) {
        maxScore = score;
        bestMatch = category;
      }
    }

    // If no category matched, use the most meaningful word as category
    if (!bestMatch) {
      const words = query.split(/\s+/).filter(w => 
        w.length > 3 && !this.fillerWords.has(w)
      );
      if (words.length > 0) {
        bestMatch = words[words.length - 1]; // Last meaningful word is often the product
      }
    }

    return bestMatch || 'general';
  }

  private extractSearchKeywords(query: string, category: string): string {
    // Remove filler words
    const words = query.split(/\s+/).filter(word => {
      const clean = word.toLowerCase().replace(/[^a-z0-9]/g, '');
      return clean.length > 0 && !this.fillerWords.has(clean);
    });

    // Join remaining words as search keywords
    return words.join(' ') || category;
  }

  private detectIntent(query: string): QueryAnalysis['intent'] {
    for (const [intent, patterns] of Object.entries(this.intentPatterns)) {
      for (const pattern of patterns) {
        if (query.includes(pattern)) {
          return intent as QueryAnalysis['intent'];
        }
      }
    }
    return 'general';
  }

  private extractFilters(query: string): QueryAnalysis['filters'] {
    const filters: QueryAnalysis['filters'] = {};

    // Extract price filters
    const underMatch = query.match(/under\s+(?:rs\.?|₹)?\s*(\d+)/i);
    if (underMatch) {
      filters.maxPrice = parseInt(underMatch[1]);
    }

    const aboveMatch = query.match(/above\s+(?:rs\.?|₹)?\s*(\d+)/i);
    if (aboveMatch) {
      filters.minPrice = parseInt(aboveMatch[1]);
    }

    const rangeMatch = query.match(/(\d+)\s*(?:to|[-–])\s*(\d+)/);
    if (rangeMatch) {
      filters.minPrice = parseInt(rangeMatch[1]);
      filters.maxPrice = parseInt(rangeMatch[2]);
    }

    // Extract rating filter
    const ratingMatch = query.match(/(\d+(?:\.\d+)?)\s*(?:star|rating)/);
    if (ratingMatch) {
      filters.minRating = parseFloat(ratingMatch[1]);
    }

    return filters;
  }

  // Generate search terms for Amazon
  generateAmazonSearchTerms(analysis: QueryAnalysis): string {
    const parts: string[] = [];
    
    // Add category
    if (analysis.category && analysis.category !== 'general') {
      parts.push(analysis.category);
    }
    
    // Add search keywords if different from category
    if (analysis.searchKeywords && 
        analysis.searchKeywords !== analysis.category &&
        !analysis.searchKeywords.includes(analysis.category)) {
      parts.push(analysis.searchKeywords);
    }

    // Join and clean
    return parts.join(' ').trim() || analysis.originalQuery;
  }
}

export const queryAnalyzer = new QueryAnalyzer();
