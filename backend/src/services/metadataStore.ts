import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";
import path from "path";
import { config } from "../utils/config";
import type { Product, Review, ProductInsight } from "../../../src/types";

export class MetadataStore {
  private db: Database<sqlite3.Database, sqlite3.Statement> | null = null;
  private dbPath: string;

  constructor() {
    this.dbPath = config.database.metadataDbPath;
  }

  async initialize(): Promise<void> {
    await this.ensureDirectory();

    this.db = await open({
      filename: this.dbPath,
      driver: sqlite3.Database,
    });

    await this.createTables();
    console.log("Metadata store initialized");
  }

  async saveProduct(product: Product): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    await this.db.run(
      `INSERT OR REPLACE INTO products (
        id, asin, title, brand, price, currency, rating, reviewCount,
        imageUrl, productUrl, features, description, category, scrapedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        product.id,
        product.asin,
        product.title,
        product.brand,
        product.price,
        product.currency,
        product.rating,
        product.reviewCount,
        product.imageUrl,
        product.productUrl,
        JSON.stringify(product.features),
        product.description,
        product.category,
        product.scrapedAt,
      ]
    );
  }

  async saveReviews(reviews: Review[]): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    const stmt = await this.db.prepare(
      `INSERT OR REPLACE INTO reviews (
        id, productId, asin, author, rating, title, content,
        date, verified, helpfulVotes, sentiment
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    for (const review of reviews) {
      await stmt.run(
        review.id,
        review.productId,
        review.asin,
        review.author,
        review.rating,
        review.title,
        review.content,
        review.date,
        review.verified ? 1 : 0,
        review.helpfulVotes,
        review.sentiment || "neutral"
      );
    }

    await stmt.finalize();
  }

  async saveInsight(insight: ProductInsight): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    await this.db.run(
      `INSERT OR REPLACE INTO insights (
        productId, asin, pros, cons, patterns, summary, analyzedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        insight.productId,
        insight.asin,
        JSON.stringify(insight.pros),
        JSON.stringify(insight.cons),
        JSON.stringify(insight.patterns),
        insight.summary,
        insight.analyzedAt,
      ]
    );
  }

  async getProductByAsin(asin: string): Promise<Product | null> {
    if (!this.db) throw new Error("Database not initialized");

    const row = await this.db.get(
      "SELECT * FROM products WHERE asin = ?",
      asin
    );

    if (!row) return null;
    return this.rowToProduct(row);
  }

  async getProductsByAsins(asins: string[]): Promise<Product[]> {
    if (!this.db || asins.length === 0) return [];

    const placeholders = asins.map(() => "?").join(",");
    const rows = await this.db.all(
      `SELECT * FROM products WHERE asin IN (${placeholders})`,
      asins
    );

    return rows.map((row) => this.rowToProduct(row));
  }

  async getReviewsByAsin(asin: string): Promise<Review[]> {
    if (!this.db) throw new Error("Database not initialized");

    const rows = await this.db.all(
      "SELECT * FROM reviews WHERE asin = ? ORDER BY rating DESC",
      asin
    );

    return rows.map((row) => ({
      id: row.id,
      productId: row.productId,
      asin: row.asin,
      author: row.author,
      rating: row.rating,
      title: row.title,
      content: row.content,
      date: row.date,
      verified: row.verified === 1,
      helpfulVotes: row.helpfulVotes,
      sentiment: row.sentiment,
    }));
  }

  async getAllProducts(): Promise<Product[]> {
    if (!this.db) throw new Error("Database not initialized");

    const rows = await this.db.all("SELECT * FROM products ORDER BY rating DESC");
    return rows.map((row) => this.rowToProduct(row));
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    if (!this.db) throw new Error("Database not initialized");

    const rows = await this.db.all(
      "SELECT * FROM products WHERE category LIKE ? ORDER BY rating DESC",
      `%${category}%`
    );

    return rows.map((row) => this.rowToProduct(row));
  }

  async searchProducts(query: string): Promise<Product[]> {
    if (!this.db) throw new Error("Database not initialized");

    const searchTerm = `%${query}%`;
    const rows = await this.db.all(
      `SELECT * FROM products WHERE 
        title LIKE ? OR 
        brand LIKE ? OR 
        description LIKE ? OR
        category LIKE ?
      ORDER BY rating DESC`,
      [searchTerm, searchTerm, searchTerm, searchTerm]
    );

    return rows.map((row) => this.rowToProduct(row));
  }

  async getStats(): Promise<{
    totalProducts: number;
    totalReviews: number;
    totalInsights: number;
    categories: string[];
  }> {
    if (!this.db) {
      return { totalProducts: 0, totalReviews: 0, totalInsights: 0, categories: [] };
    }

    const products = await this.db.get(
      "SELECT COUNT(*) as count FROM products"
    );
    const reviews = await this.db.get(
      "SELECT COUNT(*) as count FROM reviews"
    );
    const insights = await this.db.get(
      "SELECT COUNT(*) as count FROM insights"
    );

    const categoryRows = await this.db.all(
      "SELECT DISTINCT category FROM products WHERE category IS NOT NULL"
    );

    return {
      totalProducts: products?.count || 0,
      totalReviews: reviews?.count || 0,
      totalInsights: insights?.count || 0,
      categories: categoryRows.map((r) => r.category).filter(Boolean),
    };
  }

  private async ensureDirectory(): Promise<void> {
    const fs = await import("fs/promises");
    await fs.mkdir(path.dirname(this.dbPath), { recursive: true });
  }

  private async createTables(): Promise<void> {
    if (!this.db) return;

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        asin TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        brand TEXT,
        price REAL,
        currency TEXT,
        rating REAL,
        reviewCount INTEGER,
        imageUrl TEXT,
        productUrl TEXT,
        features TEXT,
        description TEXT,
        category TEXT,
        scrapedAt TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_products_asin ON products(asin);
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
      CREATE INDEX IF NOT EXISTS idx_products_rating ON products(rating);
    `);

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS reviews (
        id TEXT PRIMARY KEY,
        productId TEXT NOT NULL,
        asin TEXT NOT NULL,
        author TEXT,
        rating INTEGER,
        title TEXT,
        content TEXT,
        date TEXT,
        verified INTEGER,
        helpfulVotes INTEGER,
        sentiment TEXT,
        FOREIGN KEY (productId) REFERENCES products(id)
      );

      CREATE INDEX IF NOT EXISTS idx_reviews_asin ON reviews(asin);
      CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
    `);

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS insights (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        productId TEXT NOT NULL,
        asin TEXT NOT NULL,
        pros TEXT,
        cons TEXT,
        patterns TEXT,
        summary TEXT,
        analyzedAt TEXT,
        FOREIGN KEY (productId) REFERENCES products(id)
      );

      CREATE INDEX IF NOT EXISTS idx_insights_asin ON insights(asin);
    `);
  }

  private rowToProduct(row: any): Product {
    return {
      id: row.id,
      asin: row.asin,
      title: row.title,
      brand: row.brand || "",
      price: row.price || 0,
      currency: row.currency || "USD",
      rating: row.rating || 0,
      reviewCount: row.reviewCount || 0,
      imageUrl: row.imageUrl || "",
      productUrl: row.productUrl || "",
      features: JSON.parse(row.features || "[]"),
      description: row.description || "",
      category: row.category || "",
      scrapedAt: row.scrapedAt || new Date().toISOString(),
    };
  }
}
