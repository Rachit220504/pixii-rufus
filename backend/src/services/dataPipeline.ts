import { AmazonScraper } from "./scraper";
import { GeminiService } from "./gemini";
import { EmbeddingService } from "./embeddings";
import { VectorStore } from "./vectorStore";
import { MetadataStore } from "./metadataStore";
import { v4 as uuidv4 } from "uuid";
import type { Product, Review, ProductInsight } from "../../../src/types";

export class DataPipeline {
  private scraper: AmazonScraper;
  private gemini: GeminiService;
  private embeddings: EmbeddingService;
  private vectorStore: VectorStore;
  private metadataStore: MetadataStore;

  constructor() {
    this.scraper = new AmazonScraper();
    this.gemini = new GeminiService();
    this.embeddings = new EmbeddingService();
    this.vectorStore = new VectorStore();
    this.metadataStore = new MetadataStore();
  }

  async initialize(): Promise<void> {
    await this.vectorStore.initialize();
    await this.metadataStore.initialize();
    console.log("Data pipeline initialized");
  }

  async scrapeAndProcess(keyword: string, maxResults: number = 5): Promise<{
    products: Product[];
    reviews: Review[];
    insights: ProductInsight[];
  }> {
    console.log(`[DataPipeline] Scraping ${maxResults} products for keyword: ${keyword}`);

    const scrapedData = await this.scraper.scrapeByKeyword(keyword, maxResults);
    console.log(`[DataPipeline] Scraped ${scrapedData.length} products`);

    const products: Product[] = [];
    const allReviews: Review[] = [];
    const insights: ProductInsight[] = [];

    for (const data of scrapedData) {
      const { product: processedProduct, reviews: processedReviews } =
        await this.processScrapedData(data);

      products.push(processedProduct);
      allReviews.push(...processedReviews);

      const insight = await this.analyzeProduct(
        processedProduct,
        processedReviews
      );
      insights.push(insight);

      console.log(
        `[DataPipeline] Processed ${processedProduct.title} with ${processedReviews.length} reviews`
      );
    }
    
    console.log(`[DataPipeline] Total: ${products.length} products, ${allReviews.length} reviews, ${insights.length} insights`);

    return { products, reviews: allReviews, insights };
  }

  async processScrapedData(data: any): Promise<{
    product: Product;
    reviews: Review[];
  }> {
    const raw = data;

    const product: Product = {
      id: uuidv4(),
      asin: raw.product.asin,
      title: raw.product.title,
      brand: raw.product.brand || "",
      price: this.parsePrice(raw.product.price),
      currency: "USD",
      rating: parseFloat(raw.product.rating || "0"),
      reviewCount: parseInt(raw.product.reviewCount || "0"),
      imageUrl: raw.product.imageUrl || "",
      productUrl: raw.product.productUrl || `https://www.amazon.com/dp/${raw.product.asin}`,
      features: raw.product.features || [],
      description: raw.product.description || "",
      category: raw.product.category || "",
      scrapedAt: raw.scrapedAt || new Date().toISOString(),
    };

    const reviews: Review[] = raw.reviews.map((r: any) => ({
      id: uuidv4(),
      productId: product.id,
      asin: product.asin,
      author: r.author || "Anonymous",
      rating: parseInt(r.rating || "5"),
      title: r.title || "",
      content: r.content || "",
      date: r.date || new Date().toISOString(),
      verified: r.verified || false,
      helpfulVotes: parseInt(r.helpfulVotes || "0"),
    }));

    console.log(`[DataPipeline] Saving product: ${product.title}`);
    await this.metadataStore.saveProduct(product);
    await this.metadataStore.saveReviews(reviews);
    console.log(`[DataPipeline] Saved ${reviews.length} reviews to metadata store`);

    const chunks = await this.embeddings.processReviews(reviews);
    console.log(`[DataPipeline] Generated ${chunks.length} chunks with embeddings`);
    
    await this.vectorStore.addVectors(chunks);
    console.log(`[DataPipeline] Added vectors to FAISS index`);

    return { product, reviews };
  }

  async analyzeProduct(
    product: Product,
    reviews: Review[]
  ): Promise<ProductInsight> {
    const analysis = await this.gemini.analyzeReviews(
      product.title,
      reviews.map((r) => ({
        reviewId: r.id,
        author: r.author,
        rating: r.rating.toString(),
        title: r.title,
        content: r.content,
        date: r.date,
        verified: r.verified,
        helpfulVotes: r.helpfulVotes.toString(),
      }))
    );

    const insight: ProductInsight = {
      productId: product.id,
      asin: product.asin,
      pros: analysis.pros,
      cons: analysis.cons,
      patterns: analysis.patterns.map((p) => ({
        pattern: p.pattern,
        frequency: p.frequency,
        sentiment: p.sentiment as "positive" | "negative" | "neutral",
        exampleReview: p.example,
      })),
      summary: analysis.summary,
      analyzedAt: new Date().toISOString(),
    };

    await this.metadataStore.saveInsight(insight);

    return insight;
  }

  async getStats(): Promise<{
    products: number;
    reviews: number;
    vectors: number;
    insights: number;
  }> {
    const metadataStats = await this.metadataStore.getStats();
    const vectorStats = this.vectorStore.getStats();

    return {
      products: metadataStats.totalProducts,
      reviews: metadataStats.totalReviews,
      vectors: vectorStats.totalVectors,
      insights: metadataStats.totalInsights,
    };
  }

  private parsePrice(priceStr: string | undefined): number | null {
    if (!priceStr) return null;
    const match = priceStr.match(/[\d,]+\.?\d*/);
    if (match) {
      return parseFloat(match[0].replace(/,/g, ""));
    }
    return null;
  }
}
