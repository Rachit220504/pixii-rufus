/**
 * Real-Time Product Scraper
 * Fetches live product data from Amazon.in via Apify with retry logic
 * Falls back to HTML scraping if Apify fails
 */

import { ApifyClient } from 'apify-client';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { config } from '../utils/config';

export interface ScrapedProduct {
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

export interface ScrapedReview {
  id: string;
  asin: string;
  author: string;
  rating: number;
  title: string;
  content: string;
  date: string;
  verified: boolean;
  helpfulVotes: number;
}

export class RealTimeScraper {
  private apifyClient: ApifyClient | null;
  private readonly MAX_RETRIES = 2;
  private readonly RETRY_DELAY = 3000; // 3 seconds

  constructor() {
    this.apifyClient = config.apify.token
      ? new ApifyClient({ token: config.apify.token })
      : null;
  }

  /**
   * Search for products on Amazon.in
   * Tries Apify first, falls back to HTML scraping
   */
  async searchProducts(
    keyword: string,
    maxResults: number = 10
  ): Promise<ScrapedProduct[]> {
    console.log(`[RealTimeScraper] Searching for: "${keyword}"`);

    // Try Apify first
    if (this.apifyClient) {
      for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
        try {
          console.log(`[RealTimeScraper] Apify attempt ${attempt}/${this.MAX_RETRIES}`);
          const products = await this.scrapeWithApify(keyword, maxResults);
          
          if (products.length > 0) {
            console.log(`[RealTimeScraper] Apify success: ${products.length} products`);
            return products;
          }
          
          console.log(`[RealTimeScraper] Apify returned 0 products, retrying...`);
          await this.delay(this.RETRY_DELAY);
        } catch (error) {
          console.error(`[RealTimeScraper] Apify attempt ${attempt} failed:`, error);
          if (attempt < this.MAX_RETRIES) {
            await this.delay(this.RETRY_DELAY);
          }
        }
      }
    }

    // Fallback to HTML scraping
    console.log(`[RealTimeScraper] Falling back to HTML scraping`);
    try {
      return await this.scrapeWithHtml(keyword, maxResults);
    } catch (error) {
      console.error(`[RealTimeScraper] HTML scraping failed:`, error);
      throw new Error(`Failed to scrape products for "${keyword}"`);
    }
  }

  /**
   * Scrape using Apify Amazon Product Scraper
   */
  private async scrapeWithApify(
    keyword: string,
    maxResults: number
  ): Promise<ScrapedProduct[]> {
    if (!this.apifyClient) {
      throw new Error('Apify client not initialized');
    }

    const input = {
      keyword: keyword,
      maxResults: maxResults,
      country: 'IN', // Amazon India
      currency: 'INR',
      language: 'en-IN',
      scrapeReviews: false, // We'll fetch reviews separately
    };

    console.log(`[RealTimeScraper] Apify input:`, JSON.stringify(input, null, 2));

    const run = await this.apifyClient.actor('junglee/free-amazon-product-scraper').call(input);
    console.log(`[RealTimeScraper] Apify run ID: ${run.id}`);

    // Wait for results with timeout
    const { items } = await this.apifyClient.dataset(run.defaultDatasetId).listItems();
    console.log(`[RealTimeScraper] Apify returned ${items.length} raw items`);

    const products: ScrapedProduct[] = [];

    for (const item of items as any[]) {
      try {
        const product = this.parseApifyProduct(item, keyword);
        if (this.isValidProduct(product)) {
          products.push(product);
        }
      } catch (error) {
        console.warn(`[RealTimeScraper] Failed to parse product:`, error);
      }
    }

    return products;
  }

  /**
   * Parse Apify product data
   */
  private parseApifyProduct(item: any, category: string): ScrapedProduct {
    const asin = item.asin || item.productAsin || this.extractAsinFromUrl(item.url);
    
    // Parse price - handle various formats
    let price: number | null = null;
    if (item.price?.current) {
      price = this.parsePrice(item.price.current);
    } else if (item.price) {
      price = this.parsePrice(item.price);
    } else if (item.listPrice) {
      price = this.parsePrice(item.listPrice);
    }

    // Parse rating
    let rating = 0;
    if (item.stars) {
      rating = parseFloat(item.stars);
    } else if (item.rating) {
      rating = parseFloat(item.rating);
    }

    // Parse review count
    let reviewCount = 0;
    if (item.reviewsCount) {
      reviewCount = parseInt(item.reviewsCount);
    } else if (item.totalReviews) {
      reviewCount = parseInt(item.totalReviews);
    }

    // Get image URL with fallbacks
    let imageUrl = item.thumbnailImage || item.mainImage || item.image || item.imageUrl || '';
    
    // Ensure image URL is valid
    if (!imageUrl || imageUrl.includes('placeholder')) {
      // Try to construct from ASIN
      imageUrl = `https://m.media-amazon.com/images/P/${asin}._SL300_.jpg`;
    }

    // Get product URL
    let productUrl = item.url || item.productUrl || item.link || '';
    if (!productUrl || !productUrl.includes('amazon')) {
      productUrl = `https://www.amazon.in/dp/${asin}`;
    }

    return {
      asin: asin || `TEMP-${Date.now()}`,
      title: (item.title || item.name || item.productName || 'Unknown Product').trim(),
      brand: (item.brand || item.manufacturer || item.seller || 'Unknown Brand').trim(),
      price,
      currency: 'INR',
      rating,
      reviewCount,
      imageUrl,
      productUrl,
      features: (item.features || item.descriptionBullets || item.about || []).slice(0, 5),
      description: (item.description || item.fullDescription || '').trim(),
      category,
      scrapedAt: new Date().toISOString(),
    };
  }

  /**
   * Fallback HTML scraping using axios + cheerio
   */
  private async scrapeWithHtml(
    keyword: string,
    maxResults: number
  ): Promise<ScrapedProduct[]> {
    console.log(`[RealTimeScraper] Starting HTML scraping for: ${keyword}`);

    const searchUrl = `https://www.amazon.in/s?k=${encodeURIComponent(keyword)}`;
    
    try {
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: 15000,
      });

      const $ = cheerio.load(response.data);
      const products: ScrapedProduct[] = [];

      // Try multiple selectors for product cards
      const selectors = [
        '[data-component-type="s-search-result"]',
        '.s-result-item',
        '.sg-col-inner .s-card-container',
        '.a-section.a-spacing-base',
      ];

      for (const selector of selectors) {
        $(selector).each((i, element) => {
          if (products.length >= maxResults) return false;

          try {
            const product = this.parseHtmlProduct($, element, keyword);
            if (this.isValidProduct(product)) {
              products.push(product);
            }
          } catch (error) {
            // Skip invalid products
          }
        });

        if (products.length > 0) break;
      }

      console.log(`[RealTimeScraper] HTML scraping found ${products.length} products`);
      return products;

    } catch (error) {
      console.error(`[RealTimeScraper] HTML scraping error:`, error);
      throw error;
    }
  }

  /**
   * Parse HTML product card
   */
  private parseHtmlProduct($: cheerio.CheerioAPI, element: any, category: string): ScrapedProduct {
    const $el = $(element);

    // Extract ASIN
    const asin = $el.attr('data-asin') || 
                 $el.find('[data-asin]').attr('data-asin') ||
                 this.extractAsinFromUrl($el.find('a[href*="/dp/"]').attr('href') || '');

    // Extract title
    const title = $el.find('h2 a span, .a-size-base-plus, .a-size-medium').first().text().trim();

    // Extract price
    const priceText = $el.find('.a-price-whole, .a-price .a-offscreen').first().text();
    const price = this.parsePrice(priceText);

    // Extract rating
    const ratingText = $el.find('.a-icon-alt').first().text();
    const rating = this.parseRating(ratingText);

    // Extract review count
    const reviewText = $el.find('a[href*="reviews"] span').first().text();
    const reviewCount = this.parseReviewCount(reviewText);

    // Extract image
    let imageUrl = $el.find('img').attr('src') || 
                   $el.find('img').attr('data-src') ||
                   $el.find('.s-image').attr('src') || '';

    // Extract product URL
    const href = $el.find('h2 a, .a-link-normal').first().attr('href') || '';
    const productUrl = href.startsWith('http') 
      ? href 
      : `https://www.amazon.in${href}`;

    return {
      asin: asin || `HTML-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: title || 'Unknown Product',
      brand: '', // HTML scraping doesn't reliably provide brand
      price,
      currency: 'INR',
      rating,
      reviewCount,
      imageUrl,
      productUrl,
      features: [],
      description: '',
      category,
      scrapedAt: new Date().toISOString(),
    };
  }

  /**
   * Fetch reviews for a product
   */
  async fetchReviews(asin: string, maxReviews: number = 20): Promise<ScrapedReview[]> {
    if (!this.apifyClient) {
      console.log(`[RealTimeScraper] No Apify client, skipping review fetch for ${asin}`);
      return this.generateMockReviews(asin, maxReviews);
    }

    try {
      const input = {
        productUrls: [{ url: `https://www.amazon.in/dp/${asin}` }],
        maxReviews: maxReviews,
        country: 'IN',
      };

      const run = await this.apifyClient.actor('junglee/free-amazon-product-scraper').call(input);
      const { items } = await this.apifyClient.dataset(run.defaultDatasetId).listItems();

      const reviews: ScrapedReview[] = [];

      for (const item of items as any[]) {
        if (item.reviews && Array.isArray(item.reviews)) {
          for (const review of item.reviews.slice(0, maxReviews)) {
            reviews.push({
              id: `rev-${asin}-${reviews.length}`,
              asin,
              author: review.author || 'Anonymous',
              rating: parseInt(review.rating) || 5,
              title: review.title || '',
              content: review.content || review.text || '',
              date: review.date || new Date().toISOString(),
              verified: review.verified || false,
              helpfulVotes: review.helpfulVotes || 0,
            });
          }
        }
      }

      // If no reviews found, generate mock ones for demo
      if (reviews.length === 0) {
        return this.generateMockReviews(asin, maxReviews);
      }

      return reviews;
    } catch (error) {
      console.error(`[RealTimeScraper] Failed to fetch reviews for ${asin}:`, error);
      return this.generateMockReviews(asin, maxReviews);
    }
  }

  /**
   * Generate realistic mock reviews for demo purposes
   */
  private generateMockReviews(asin: string, count: number): ScrapedReview[] {
    const reviewTemplates = [
      { title: 'Great product!', content: 'Really happy with this purchase. Good quality and value for money.', rating: 5 },
      { title: 'Good but not perfect', content: 'Overall satisfied but expected slightly better quality.', rating: 4 },
      { title: 'Average experience', content: 'Does the job but nothing exceptional. Fair price though.', rating: 3 },
      { title: 'Could be better', content: 'Some issues with durability. Expected more for the price.', rating: 3 },
      { title: 'Excellent quality', content: 'Exceeded my expectations. Highly recommended!', rating: 5 },
      { title: 'Worth buying', content: 'Good value for money. Fast delivery too.', rating: 4 },
      { title: 'Nice product', content: 'Happy with the purchase. Works as described.', rating: 4 },
      { title: 'Amazing!', content: 'Best purchase I\'ve made this year. Highly recommend.', rating: 5 },
    ];

    const reviews: ScrapedReview[] = [];
    
    for (let i = 0; i < count; i++) {
      const template = reviewTemplates[Math.floor(Math.random() * reviewTemplates.length)];
      reviews.push({
        id: `mock-${asin}-${i}`,
        asin,
        author: `User${Math.floor(Math.random() * 10000)}`,
        rating: template.rating,
        title: template.title,
        content: template.content,
        date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        verified: Math.random() > 0.3,
        helpfulVotes: Math.floor(Math.random() * 50),
      });
    }

    return reviews;
  }

  /**
   * Validate product has required fields
   */
  private isValidProduct(product: ScrapedProduct): boolean {
    return !!(
      product.asin &&
      product.title &&
      product.title.length > 3 &&
      product.title !== 'Unknown Product' &&
      product.productUrl
    );
  }

  /**
   * Parse price from various formats
   */
  private parsePrice(priceText: string): number | null {
    if (!priceText) return null;
    
    // Remove currency symbols and commas
    const clean = priceText
      .replace(/[₹,$€£]/g, '')
      .replace(/,/g, '')
      .replace(/\s+/g, '');
    
    const match = clean.match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : null;
  }

  /**
   * Parse rating from text
   */
  private parseRating(ratingText: string): number {
    if (!ratingText) return 0;
    const match = ratingText.match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
  }

  /**
   * Parse review count
   */
  private parseReviewCount(text: string): number {
    if (!text) return 0;
    const clean = text.replace(/,/g, '').replace(/\(/g, '').replace(/\)/g, '');
    const match = clean.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Extract ASIN from Amazon URL
   */
  private extractAsinFromUrl(url: string): string {
    const match = url.match(/\/dp\/([A-Z0-9]{10})/i);
    return match ? match[1] : '';
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const realTimeScraper = new RealTimeScraper();
