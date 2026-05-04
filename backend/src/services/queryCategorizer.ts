/**
 * QueryCategorizer - Detects product category from user query
 * Uses keyword matching and pattern recognition
 */

export interface CategoryDetectionResult {
  category: string;
  subcategory: string | null;
  confidence: number;
  searchTerms: string[];
}

export class QueryCategorizer {
  private categoryPatterns: Map<string, RegExp[]>;
  private keywordMapping: Map<string, string[]>;

  constructor() {
    this.categoryPatterns = this.initializeCategoryPatterns();
    this.keywordMapping = this.initializeKeywordMapping();
  }

  private initializeCategoryPatterns(): Map<string, RegExp[]> {
    const patterns = new Map<string, RegExp[]>();

    // Electronics
    patterns.set('electronics', [
      /tv|television|smart\s*tv|oled|qled|4k\s*tv/i,
      /phone|smartphone|mobile|iphone|android/i,
      /laptop|notebook|macbook|ultrabook/i,
      /headphone|earphone|earbud|airpod|headset/i,
      /camera|dslr|mirrorless|gopro|webcam/i,
      /watch|smartwatch|fitbit|apple\s*watch/i,
      /tablet|ipad|galaxy\s*tab|kindle/i,
      /speaker|soundbar|bluetooth\s*speaker|home\s*theater/i,
    ]);

    // Home & Kitchen
    patterns.set('home_kitchen', [
      /refrigerator|fridge|freezer/i,
      /washing\s*machine|washer|dryer/i,
      /microwave|oven|air\s*fryer|blender|mixer/i,
      /vacuum\s*cleaner|robot\s*vacuum/i,
      /furniture|sofa|chair|table|bed|mattress/i,
      /kitchen| cookware|utensil|cutlery/i,
    ]);

    // Fashion
    patterns.set('fashion', [
      /shoe|sneaker|boot|sandal|slipper|footwear/i,
      /watch|wristwatch|analog\s*watch|digital\s*watch/i,
      /bag|backpack|handbag|luggage|suitcase/i,
      /clothing|shirt|t-shirt|jeans|dress|jacket/i,
      /jewelry|necklace|ring|earring|bracelet/i,
    ]);

    // Health & Personal Care
    patterns.set('health_personal', [
      /vitamin|supplement|protein|whey|creatine/i,
      /skincare|moisturizer|serum|sunscreen|face\s*wash/i,
      /haircare|shampoo|conditioner|hair\s*oil/i,
      /makeup|lipstick|foundation|mascara|eyeliner/i,
      /personal\s*care|toothbrush|toothpaste|razor|trimmer/i,
    ]);

    // Sports & Outdoors
    patterns.set('sports_outdoors', [
      /gym|fitness|treadmill|dumbbell|yoga\s*mat/i,
      /sports|cricket|football|badminton|tennis/i,
      /cycling|bicycle|bike|cycle/i,
      /camping|tent|sleeping\s*bag|hiking/i,
    ]);

    // Computers & Accessories
    patterns.set('computers', [
      /keyboard|mechanical\s*keyboard|gaming\s*keyboard/i,
      /mouse|gaming\s*mouse|wireless\s*mouse/i,
      /monitor|display|screen|gaming\s*monitor/i,
      /cpu|processor|gpu|graphics\s*card|ram|ssd/i,
      /router|wifi|network|ethernet/i,
    ]);

    // Books & Media
    patterns.set('books_media', [
      /book|novel|fiction|non-fiction|biography/i,
      /kindle|e-reader|ebook/i,
    ]);

    return patterns;
  }

  private initializeKeywordMapping(): Map<string, string[]> {
    const mapping = new Map<string, string[]>();

    // Specific product mappings
    mapping.set('tv', ['television', 'smart tv', 'oled', 'qled', '4k', 'led tv']);
    mapping.set('headphone', ['headphones', 'earphones', 'earbuds', 'headset', 'airpods']);
    mapping.set('laptop', ['laptop', 'notebook', 'macbook', 'ultrabook', 'gaming laptop']);
    mapping.set('phone', ['phone', 'smartphone', 'mobile', 'iphone', 'android']);
    mapping.set('watch', ['watch', 'smartwatch', 'fitness tracker', 'apple watch']);
    mapping.set('keyboard', ['keyboard', 'mechanical keyboard', 'gaming keyboard']);
    mapping.set('mouse', ['mouse', 'gaming mouse', 'wireless mouse']);
    mapping.set('shoe', ['shoes', 'sneakers', 'boots', 'sandals', 'footwear']);
    mapping.set('vitamin', ['vitamin', 'supplement', 'multivitamin']);
    mapping.set('protein', ['protein', 'whey protein', 'protein powder']);
    mapping.set('camera', ['camera', 'dslr', 'mirrorless', 'gopro']);
    mapping.set('speaker', ['speaker', 'bluetooth speaker', 'soundbar', 'home theater']);
    mapping.set('refrigerator', ['refrigerator', 'fridge', 'freezer']);
    mapping.set('washing_machine', ['washing machine', 'washer', 'dryer']);
    mapping.set('furniture', ['furniture', 'sofa', 'chair', 'table', 'bed']);

    return mapping;
  }

  categorize(query: string): CategoryDetectionResult {
    const normalizedQuery = query.toLowerCase().trim();
    
    // Remove common filler words
    const cleanedQuery = this.cleanQuery(normalizedQuery);
    
    // Check each category pattern
    let bestMatch: CategoryDetectionResult | null = null;
    let highestConfidence = 0;

    for (const [category, patterns] of this.categoryPatterns) {
      for (const pattern of patterns) {
        const match = cleanedQuery.match(pattern);
        if (match) {
          const confidence = this.calculateConfidence(match[0], cleanedQuery);
          if (confidence > highestConfidence) {
            highestConfidence = confidence;
            bestMatch = {
              category,
              subcategory: this.extractSubcategory(match[0], category),
              confidence,
              searchTerms: this.extractSearchTerms(cleanedQuery, match[0]),
            };
          }
        }
      }
    }

    // If no strong match, use keyword extraction
    if (!bestMatch || bestMatch.confidence < 0.3) {
      const extractedCategory = this.extractCategoryFromKeywords(cleanedQuery);
      if (extractedCategory) {
        bestMatch = extractedCategory;
      }
    }

    // Default fallback
    if (!bestMatch) {
      bestMatch = {
        category: 'general',
        subcategory: null,
        confidence: 0.1,
        searchTerms: this.extractGenericTerms(cleanedQuery),
      };
    }

    return bestMatch;
  }

  private cleanQuery(query: string): string {
    const fillerWords = [
      'best', 'top', 'good', 'great', 'amazing', 'awesome', 'cheap', 'affordable',
      'premium', 'quality', 'want', 'need', 'looking', 'for', 'buy', 'purchase',
      'get', 'find', 'suggest', 'recommend', 'show', 'me', 'some', 'the', 'a', 'an',
      'under', 'below', 'above', 'over', 'between', 'and', 'or', 'with', 'without'
    ];

    let cleaned = query;
    for (const word of fillerWords) {
      cleaned = cleaned.replace(new RegExp(`\\b${word}\\b`, 'gi'), ' ');
    }

    // Remove price patterns (e.g., "under 5000", "below 10000")
    cleaned = cleaned.replace(/under\s*\d+/gi, '');
    cleaned = cleaned.replace(/below\s*\d+/gi, '');
    cleaned = cleaned.replace(/above\s*\d+/gi, '');
    cleaned = cleaned.replace(/\d+\s*-\s*\d+/gi, '');

    return cleaned.replace(/\s+/g, ' ').trim();
  }

  private calculateConfidence(matchedTerm: string, query: string): number {
    let confidence = 0.5;

    // Higher confidence for longer matches
    confidence += Math.min(matchedTerm.length / 20, 0.2);

    // Higher confidence if match is at start of query
    if (query.indexOf(matchedTerm.toLowerCase()) < 10) {
      confidence += 0.15;
    }

    // Higher confidence for specific product names
    if (matchedTerm.length > 8) {
      confidence += 0.1;
    }

    return Math.min(confidence, 0.95);
  }

  private extractSubcategory(matchedTerm: string, category: string): string | null {
    const subcategoryMap: Record<string, Record<string, string>> = {
      'electronics': {
        'tv': 'tv',
        'television': 'tv',
        'phone': 'phone',
        'smartphone': 'phone',
        'laptop': 'laptop',
        'headphone': 'audio',
        'earphone': 'audio',
        'earbud': 'audio',
        'speaker': 'audio',
        'camera': 'camera',
        'watch': 'wearable',
        'tablet': 'tablet',
      },
      'computers': {
        'keyboard': 'keyboard',
        'mouse': 'mouse',
        'monitor': 'monitor',
        'cpu': 'components',
        'gpu': 'components',
        'router': 'networking',
      },
      'health_personal': {
        'vitamin': 'supplements',
        'supplement': 'supplements',
        'protein': 'supplements',
        'skincare': 'skincare',
        'makeup': 'makeup',
        'haircare': 'haircare',
      },
    };

    const categoryMap = subcategoryMap[category];
    if (categoryMap) {
      for (const [key, value] of Object.entries(categoryMap)) {
        if (matchedTerm.toLowerCase().includes(key)) {
          return value;
        }
      }
    }

    return null;
  }

  private extractSearchTerms(query: string, matchedTerm: string): string[] {
    const terms: string[] = [];
    
    // Add the matched term
    terms.push(matchedTerm.toLowerCase().trim());

    // Add related keywords from mapping
    for (const [key, keywords] of this.keywordMapping) {
      if (query.includes(key)) {
        terms.push(...keywords);
      }
    }

    // Add specific modifiers found in query
    const modifiers = this.extractModifiers(query);
    terms.push(...modifiers);

    // Remove duplicates and return
    return [...new Set(terms)];
  }

  private extractModifiers(query: string): string[] {
    const modifiers: string[] = [];
    
    // Price modifiers
    const priceMatch = query.match(/under\s*(\d+)/i);
    if (priceMatch) {
      modifiers.push(`budget-${priceMatch[1]}`);
    }

    // Quality modifiers
    if (query.includes('gaming')) modifiers.push('gaming');
    if (query.includes('wireless')) modifiers.push('wireless');
    if (query.includes('bluetooth')) modifiers.push('bluetooth');
    if (query.includes('mechanical')) modifiers.push('mechanical');
    if (query.includes('noise cancelling') || query.includes('anc')) modifiers.push('noise-cancelling');

    return modifiers;
  }

  private extractCategoryFromKeywords(query: string): CategoryDetectionResult | null {
    for (const [key, keywords] of this.keywordMapping) {
      for (const keyword of keywords) {
        if (query.includes(keyword.toLowerCase())) {
          return {
            category: this.mapToMainCategory(key),
            subcategory: key,
            confidence: 0.6,
            searchTerms: keywords,
          };
        }
      }
    }
    return null;
  }

  private mapToMainCategory(keyword: string): string {
    const mainCategoryMap: Record<string, string> = {
      'tv': 'electronics',
      'headphone': 'electronics',
      'laptop': 'electronics',
      'phone': 'electronics',
      'watch': 'electronics',
      'camera': 'electronics',
      'speaker': 'electronics',
      'keyboard': 'computers',
      'mouse': 'computers',
      'shoe': 'fashion',
      'vitamin': 'health_personal',
      'protein': 'health_personal',
      'refrigerator': 'home_kitchen',
      'furniture': 'home_kitchen',
    };

    return mainCategoryMap[keyword] || 'general';
  }

  private extractGenericTerms(query: string): string[] {
    // Extract meaningful words (3+ chars)
    const words = query.split(/\s+/);
    return words.filter(w => w.length >= 3 && !this.isStopWord(w));
  }

  private isStopWord(word: string): boolean {
    const stopWords = [
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'she', 'use', 'her', 'way', 'many', 'oil', 'sit', 'set', 'run', 'eat', 'far', 'sea', 'eye', 'ago', 'off', 'too', 'any', 'say', 'man', 'try', 'ask', 'end', 'why', 'let', 'put', 'say', 'she', 'try', 'way', 'own', 'say', 'too', 'old', 'tell', 'very', 'when', 'much', 'would', 'there', 'their', 'what', 'said', 'each', 'which', 'will', 'about', 'could', 'other', 'after', 'first', 'never', 'these', 'think', 'where', 'being', 'every', 'great', 'might', 'shall', 'still', 'those', 'while', 'this', 'that', 'with', 'from', 'they', 'know', 'want', 'been', 'were', 'said', 'time', 'than', 'them', 'into', 'just', 'look', 'more', 'come', 'made', 'over', 'such', 'take', 'only', 'back', 'well', 'were', 'even', 'most', 'like', 'then', 'also', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'she', 'use', 'her', 'way', 'many', 'oil', 'sit', 'set', 'run', 'eat', 'far', 'sea', 'eye', 'ago', 'off', 'too', 'any', 'say', 'man', 'try', 'ask', 'end', 'why', 'let', 'put', 'say', 'she', 'try', 'way', 'own', 'say', 'too', 'old', 'tell', 'very', 'when', 'much'
    ];
    return stopWords.includes(word.toLowerCase());
  }

  // Helper method to generate search keywords for Apify
  generateSearchKeywords(query: string, categoryResult: CategoryDetectionResult): string {
    const { category, subcategory, searchTerms } = categoryResult;
    
    // Build search query for Amazon
    let searchQuery = query;
    
    // Clean up filler words
    searchQuery = this.cleanQueryForAmazon(searchQuery);
    
    // Add category context if confidence is high
    if (categoryResult.confidence > 0.7 && subcategory) {
      // Don't duplicate if already in query
      if (!searchQuery.toLowerCase().includes(subcategory.toLowerCase())) {
        searchQuery = `${subcategory} ${searchQuery}`;
      }
    }

    return searchQuery.trim();
  }

  private cleanQueryForAmazon(query: string): string {
    // Remove words that don't help Amazon search
    const amazonNoiseWords = [
      'best', 'top', 'good', 'great', 'cheap', 'affordable', 'expensive', 'premium',
      'i want', 'i need', 'looking for', 'suggest', 'recommend', 'show me',
      'buy', 'purchase', 'get', 'find', 'help', 'please', 'can you'
    ];

    let cleaned = query.toLowerCase();
    for (const word of amazonNoiseWords) {
      cleaned = cleaned.replace(new RegExp(`\\b${word}\\b`, 'gi'), ' ');
    }

    return cleaned.replace(/\s+/g, ' ').trim();
  }

  /**
   * Detect if this is a new product search query
   * Returns true if query contains shopping intent keywords
   */
  isNewSearch(query: string): boolean {
    const normalizedQuery = query.toLowerCase().trim();
    
    // Keywords that indicate a new product search
    const searchIntentKeywords = [
      'buy', 'purchase', 'shop', 'shopping',
      'best', 'top', 'good', 'great', 'recommend',
      'suggest', 'looking for', 'need', 'want',
      'compare', 'vs', 'versus',
      'under', 'below', 'cheap', 'affordable',
      'review', 'reviews'
    ];
    
    // Check for search intent keywords
    for (const keyword of searchIntentKeywords) {
      if (normalizedQuery.includes(keyword)) {
        return true;
      }
    }
    
    // Check if query is a short product query (e.g., "mechanical keyboard", "TV")
    const words = normalizedQuery.split(/\s+/).filter(w => w.length > 2);
    const categoryResult = this.categorize(query);
    
    // If we detect a category with high confidence and it's a short query, treat as new search
    if (categoryResult.confidence > 0.6 && words.length <= 5) {
      return true;
    }
    
    // Check for product-specific patterns
    const productPatterns = [
      /\btv\b/i, /\btelevision\b/i,
      /\bphone\b/i, /\bsmartphone\b/i,
      /\blaptop\b/i, /\bcomputer\b/i,
      /\bkeyboard\b/i, /\bmouse\b/i,
      /\bheadphone\b/i, /\bearbud\b/i,
      /\bwatch\b/i, /\bsmartwatch\b/i,
      /\bcamera\b/i,
      /\bspeaker\b/i,
      /\btablet\b/i, /\bipad\b/i,
      /\bshoe\b/i, /\bsneaker\b/i,
      /\bbag\b/i, /\backpack\b/i,
      /\bvitamin\b/i, /\bsupplement\b/i,
      /\bprotein\b/i
    ];
    
    for (const pattern of productPatterns) {
      if (pattern.test(normalizedQuery)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Detect if this is a follow-up question about previous results
   */
  isFollowUp(query: string, previousQuery?: string): boolean {
    if (!previousQuery) return false;
    
    const normalizedQuery = query.toLowerCase().trim();
    
    // Follow-up indicators
    const followUpPatterns = [
      /^(what|which) (about|is|are)/i,
      /^(how|why|is|are|can|does|do|will|would)/i,
      /^(tell me|show me|give me)/i,
      /\b(them|those|these|it|that|this one)\b/i,
      /\b(more|cheaper|better|worse|difference)\b/i,
      /\b(between|compare|difference|vs)\b/i,
      /\b(which|what)\b.*\b(one|option|choice|product)\b/i
    ];
    
    for (const pattern of followUpPatterns) {
      if (pattern.test(normalizedQuery)) {
        return true;
      }
    }
    
    // Check if query is short and refers to previous context
    if (normalizedQuery.length < 30 && !this.isNewSearch(query)) {
      return true;
    }
    
    return false;
  }
}
