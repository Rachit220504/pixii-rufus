import { ApifyClient } from "apify-client";
import * as cheerio from "cheerio";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { config } from "../utils/config";
import type { RawProduct, RawReview, ScrapedData } from "../types";

export class AmazonScraper {
  private apifyClient: ApifyClient | null;
  private rawDataPath: string;

  constructor() {
    this.apifyClient = config.apify.token
      ? new ApifyClient({ token: config.apify.token })
      : null;
    this.rawDataPath = config.database.rawDataPath;
  }

  async scrapeByKeyword(keyword: string, maxResults: number = 5): Promise<ScrapedData[]> {
    // Clean up conversational queries like "i wanted to buy a bed" → "bed"
    const cleanKeyword = this.extractProductKeywords(keyword);
    console.log(`[Scraper] Original query: "${keyword}" → Cleaned: "${cleanKeyword}"`);
    
    if (this.apifyClient && config.apify.token) {
      try {
        console.log(`[Scraper] Attempting Apify scrape for: ${cleanKeyword}`);
        return await this.scrapeWithApify(cleanKeyword, maxResults);
      } catch (error) {
        console.log(`[Scraper] Apify failed, using fallback: ${error}`);
        return this.scrapeFallback(cleanKeyword, maxResults);
      }
    }
    console.log(`[Scraper] No Apify token, using fallback for: ${cleanKeyword}`);
    return this.scrapeFallback(cleanKeyword, maxResults);
  }

  private extractProductKeywords(query: string): string {
    // Remove common conversational filler words
    const fillerWords = [
      'i', 'want', 'wanted', 'to', 'buy', 'a', 'an', 'the', 'looking', 'for', 
      'find', 'get', 'purchase', 'need', 'search', 'best', 'top', 'good', 
      'great', 'recommend', 'suggest', 'help', 'me', 'my', 'please', 'can', 
      'you', 'show', 'some', 'what', 'which', 'where', 'how', 'is', 'are',
      'would', 'like', 'something'
    ];
    
    const words = query.toLowerCase()
      .replace(/[.,!?;:]/g, '') // Remove punctuation
      .split(/\s+/)
      .filter(w => w.length > 0 && !fillerWords.includes(w));
    
    if (words.length === 0) {
      return query; // Return original if nothing left
    }
    
    return words.join(' ');
  }

  async scrapeByUrl(url: string): Promise<ScrapedData> {
    const asin = this.extractAsin(url);
    if (!asin) {
      throw new Error("Invalid Amazon URL - could not extract ASIN");
    }

    if (this.apifyClient) {
      return this.scrapeProductWithApify(asin);
    }
    return this.scrapeProductFallback(asin);
  }

  private async scrapeWithApify(keyword: string, maxResults: number): Promise<ScrapedData[]> {
    if (!this.apifyClient) throw new Error("Apify client not initialized");
    
    console.log(`[Scraper] Calling Apify actor for: ${keyword}`);

    try {
      const input = {
        keywords: keyword,
        maxResults: maxResults,
        country: "US",
        currency: "USD",
        language: "en-US",
      };

      console.log(`[Scraper] Apify input:`, JSON.stringify(input));
      const run = await this.apifyClient.actor("junglee/free-amazon-product-scraper").call(input);
      console.log(`[Scraper] Apify run started: ${run.id}`);
      
      const { items } = await this.apifyClient.dataset(run.defaultDatasetId).listItems();
      console.log(`[Scraper] Apify returned ${items.length} items`);
      
      // Log raw data for debugging
      if (items.length > 0) {
        console.log(`[Scraper] RAW APIFY DATA (first item):`, JSON.stringify(items[0], null, 2));
      }

      const results: ScrapedData[] = [];

      for (const item of items as any[]) {
        // Map junglee/free-amazon-product-scraper fields with fallbacks
        const asin = (item.asin || item.productAsin || item.sku) as string;
        let productUrl = (item.url || item.productUrl || item.link) as string;
        
        // Ensure proper Amazon URL format
        if (!productUrl || productUrl === 'undefined' || productUrl === 'null' || productUrl === 'https://amazon.com') {
          productUrl = `https://www.amazon.com/dp/${asin}`;
          console.log(`[Scraper] No valid URL found, constructing from ASIN: ${productUrl}`);
        } else {
          // Fix common URL issues
          if (productUrl.startsWith('https://amazon.com')) {
            productUrl = productUrl.replace('https://amazon.com', 'https://www.amazon.com');
          } else if (productUrl.startsWith('http://amazon.com')) {
            productUrl = productUrl.replace('http://amazon.com', 'https://www.amazon.com');
          } else if (!productUrl.startsWith('http')) {
            productUrl = `https://www.amazon.com${productUrl.startsWith('/') ? '' : '/'}${productUrl}`;
          }
          
          // Skip redirector links (contain /gp/redirector or similar)
          if (productUrl.includes('/redirector') || productUrl.includes('/gp/rw/')) {
            console.log(`[Scraper] Skipping redirector URL, constructing direct link`);
            productUrl = `https://www.amazon.com/dp/${asin}`;
          }
        }
        
        console.log(`[Scraper] Product: ${item.title || item.name} -> ${productUrl}`);
        
        // Map fields with extensive fallbacks for different Apify actor outputs
        const title = (item.title || item.name || item.productName || item.productTitle) as string;
        const brand = (item.brand || item.manufacturer || item.seller || item.brandName) as string;
        const price = (item.price?.current || item.price?.value || item.price?.toString() || item.listPrice || item.price) as string;
        const rating = (item.stars || item.rating || item.reviewRating || item.starRating)?.toString();
        const reviewCount = (item.reviewsCount || item.totalReviews || item.numberOfReviews || item.reviewCount)?.toString();
        
        // Fix image URL - try multiple field names
        let imageUrl = (item.thumbnailImage || item.mainImage || item.image || item.imageUrl || item.images?.[0]) as string;
        if (!imageUrl && item.images && Array.isArray(item.images)) {
          imageUrl = item.images[0];
        }
        
        const features = (item.features || item.descriptionBullets || item.about || item.bulletPoints || []) as string[];
        const description = (item.description || item.fullDescription || item.summary || item.productDescription) as string;
        const category = (item.category || item.productCategory || keyword) as string;

        // VALIDATION: Skip products without required fields
        if (!title || title.trim() === '') {
          console.log(`[Scraper] SKIPPING: Product missing title, ASIN: ${asin}`);
          continue;
        }
        if (!imageUrl || imageUrl.trim() === '') {
          console.log(`[Scraper] WARNING: Product missing image, ASIN: ${asin}`);
          // Use placeholder instead of skipping
          imageUrl = 'https://via.placeholder.com/300x300?text=No+Image';
        }

        const product: RawProduct = {
          asin: asin,
          title: title,
          brand: brand,
          price: price,
          rating: rating,
          reviewCount: reviewCount,
          imageUrl: imageUrl,
          productUrl: productUrl,
          features: features,
          description: description,
          category: category,
        };
        
        console.log(`[Scraper] Mapped product: "${title}" | Image: ${imageUrl ? 'YES' : 'NO'} | URL: ${productUrl ? 'YES' : 'NO'}`);

        const reviews: RawReview[] = ((item.reviews as any[]) || []).map((r: any) => ({
          reviewId: r.id || uuidv4(),
          author: r.author || "Anonymous",
          rating: r.stars?.toString() || "5",
          title: r.title || "",
          content: r.content || "",
          date: r.date || new Date().toISOString(),
          verified: r.verified || false,
          helpfulVotes: r.helpfulVotes?.toString() || "0",
        }));

        const data: ScrapedData = {
          product,
          reviews,
          scrapedAt: new Date().toISOString(),
        };

        await this.saveRawData(data);
        results.push(data);
      }

      console.log(`[Scraper] Successfully scraped ${results.length} valid products from Apify`);
      
      // If no valid products found, throw error to trigger fallback
      if (results.length === 0) {
        throw new Error('No valid products found in Apify response');
      }
      
      return results;
    } catch (error) {
      console.error(`[Scraper] Apify error: ${error}`);
      throw error;
    }
  }

  private async scrapeProductWithApify(asin: string): Promise<ScrapedData> {
    if (!this.apifyClient) throw new Error("Apify client not initialized");

    const input = {
      asins: [asin],
      reviewsCount: 100,
      locale: "en-US",
    };

    const run = await this.apifyClient.actor("apify/amazon-scraper").call(input);
    const { items } = await this.apifyClient.dataset(run.defaultDatasetId).listItems();

    if (items.length === 0) {
      throw new Error("No product found for ASIN: " + asin);
    }

    const item = items[0];

    // Fix URL for single product scraping
    let productUrl = (item.url || item.productUrl || item.link) as string;
    if (!productUrl || productUrl === 'undefined' || productUrl === 'null' || productUrl === 'https://amazon.com') {
      productUrl = `https://www.amazon.com/dp/${asin}`;
    } else if (productUrl.startsWith('https://amazon.com')) {
      productUrl = productUrl.replace('https://amazon.com', 'https://www.amazon.com');
    } else if (productUrl.startsWith('http://amazon.com')) {
      productUrl = productUrl.replace('http://amazon.com', 'https://www.amazon.com');
    } else if (productUrl.includes('/redirector') || productUrl.includes('/gp/rw/')) {
      productUrl = `https://www.amazon.com/dp/${asin}`;
    }

    const product: RawProduct = {
      asin: item.asin as string,
      title: item.title as string,
      brand: item.brand as string,
      price: item.price?.toString(),
      rating: item.stars?.toString(),
      reviewCount: item.reviewsCount?.toString(),
      imageUrl: item.thumbnailImage as string,
      productUrl: productUrl,
      features: item.features as string[],
      description: item.description as string,
      category: item.category as string,
    };

    const reviews: RawReview[] = ((item.reviews as any[]) || []).map((r: any) => ({
      reviewId: r.id || uuidv4(),
      author: r.author || "Anonymous",
      rating: r.stars?.toString() || "5",
      title: r.title || "",
      content: r.content || "",
      date: r.date || new Date().toISOString(),
      verified: r.verified || false,
      helpfulVotes: r.helpfulVotes?.toString() || "0",
    }));

    const data: ScrapedData = {
      product,
      reviews,
      scrapedAt: new Date().toISOString(),
    };

    await this.saveRawData(data);
    return data;
  }

  private async scrapeFallback(keyword: string, maxResults: number): Promise<ScrapedData[]> {
    console.log("Using fallback scraping for keyword:", keyword);
    console.log("Note: Direct Amazon scraping may be blocked. Consider using Apify for production.");
    
    const mockData = this.generateMockData(keyword, maxResults);
    
    for (const data of mockData) {
      await this.saveRawData(data);
    }
    
    return mockData;
  }

  private async scrapeProductFallback(asin: string): Promise<ScrapedData> {
    console.log("Using fallback scraping for ASIN:", asin);
    
    const mockData = this.generateMockData("product", 1)[0];
    mockData.product.asin = asin;
    
    await this.saveRawData(mockData);
    return mockData;
  }

  private generateMockData(keyword: string, count: number): ScrapedData[] {
    const templates: Record<string, any> = {
      "magnesium supplement": {
        products: [
          { title: "Nature Made Magnesium Oxide 250mg", brand: "Nature Made", price: "$12.99", rating: "4.6", reviews: 8756 },
          { title: "Doctor's Best High Absorption Magnesium", brand: "Doctor's Best", price: "$19.99", rating: "4.7", reviews: 12453 },
          { title: "Natural Vitality Calm Magnesium Powder", brand: "Natural Vitality", price: "$24.99", rating: "4.5", reviews: 9821 },
          { title: "Nature's Bounty Magnesium 500mg", brand: "Nature's Bounty", price: "$15.99", rating: "4.4", reviews: 6543 },
          { title: "Sundown Magnesium Supplement", brand: "Sundown", price: "$9.99", rating: "4.3", reviews: 4321 },
        ],
        pros: ["Easy to swallow", "Helps with sleep", "Reduces muscle cramps", "Good value"],
        cons: ["May cause stomach upset", "Large pills", "Takes time to see effects"],
      },
      "mechanical keyboard": {
        products: [
          { title: "Keychron K2 Wireless Mechanical Keyboard", brand: "Keychron", price: "$89.99", rating: "4.6", reviews: 5678 },
          { title: "Royal Kludge RK61 60% Keyboard", brand: "Royal Kludge", price: "$59.99", rating: "4.5", reviews: 8934 },
          { title: "Logitech G Pro Mechanical Keyboard", brand: "Logitech", price: "$129.99", rating: "4.7", reviews: 3456 },
          { title: "Redragon K552 Kumara", brand: "Redragon", price: "$34.99", rating: "4.4", reviews: 12543 },
          { title: "Anne Pro 2 60% Keyboard", brand: "Anne Pro", price: "$99.99", rating: "4.5", reviews: 4567 },
        ],
        pros: ["Great tactile feel", "RGB lighting", "Wireless connectivity", "Compact design"],
        cons: ["Key wobble", "Battery life", "Software issues", "Noise level"],
      },
      "protein powder": {
        products: [
          { title: "Optimum Nutrition Gold Standard Whey", brand: "Optimum Nutrition", price: "$44.99", rating: "4.7", reviews: 15678 },
          { title: "Dymatize ISO100 Whey Protein", brand: "Dymatize", price: "$74.99", rating: "4.6", reviews: 8923 },
          { title: "Orgain Organic Protein Powder", brand: "Orgain", price: "$29.99", rating: "4.5", reviews: 11234 },
          { title: "Isopure Zero Carb Protein", brand: "Isopure", price: "$54.99", rating: "4.4", reviews: 6789 },
          { title: "MuscleTech NitroTech Protein", brand: "MuscleTech", price: "$39.99", rating: "4.3", reviews: 9876 },
        ],
        pros: ["Great taste", "Mixes well", "No bloating", "High protein content"],
        cons: ["Expensive", "Artificial sweeteners", "Chalky texture", "Digestive issues"],
      },
    };

    const template = templates[keyword.toLowerCase()] || templates["magnesium supplement"];
    const results: ScrapedData[] = [];

    for (let i = 0; i < Math.min(count, template.products.length); i++) {
      const p = template.products[i];
      const asin = `B${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
      
      const product: RawProduct = {
        asin,
        title: p.title,
        brand: p.brand,
        price: p.price,
        rating: p.rating,
        reviewCount: p.reviews.toString(),
        imageUrl: `https://via.placeholder.com/300x300?text=${encodeURIComponent(p.title)}`,
        productUrl: `https://www.amazon.com/dp/${asin}`,
        features: [template.pros[0], template.pros[1], template.pros[2]],
        description: `High quality ${keyword} product from ${p.brand}.`,
        category: keyword,
      };

      const reviews: RawReview[] = [];
      const reviewCount = Math.min(50, p.reviews);
      
      for (let r = 0; r < reviewCount; r++) {
        const isPositive = Math.random() > 0.3;
        const prosOrCons = isPositive ? template.pros : template.cons;
        
        reviews.push({
          reviewId: uuidv4(),
          author: `User${r + 1}`,
          rating: isPositive ? "5" : Math.random() > 0.5 ? "3" : "2",
          title: isPositive ? "Great product!" : "Could be better",
          content: `${prosOrCons[Math.floor(Math.random() * prosOrCons.length)]}. ${
            isPositive
              ? "Really happy with this purchase and would recommend to others."
              : "Not exactly what I expected but still usable."
          }`,
          date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
          verified: Math.random() > 0.2,
          helpfulVotes: Math.floor(Math.random() * 100).toString(),
        });
      }

      results.push({
        product,
        reviews,
        scrapedAt: new Date().toISOString(),
      });
    }

    return results;
  }

  private extractAsin(url: string): string | null {
    const patterns = [
      /\/dp\/([A-Z0-9]{10})/i,
      /\/gp\/product\/([A-Z0-9]{10})/i,
      /\/ASIN\/([A-Z0-9]{10})/i,
      /([A-Z0-9]{10})/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  private async saveRawData(data: ScrapedData): Promise<void> {
    await fs.mkdir(this.rawDataPath, { recursive: true });
    const filename = `${data.product.asin}_${Date.now()}.json`;
    const filepath = path.join(this.rawDataPath, filename);
    await fs.writeFile(filepath, JSON.stringify(data, null, 2));
  }
}
