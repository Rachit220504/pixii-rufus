import * as faiss from "faiss-node";
import fs from "fs/promises";
import path from "path";
import { config } from "../utils/config";
import type { ReviewChunk, VectorSearchResult } from "../types";

export class VectorStore {
  private index: faiss.IndexFlatIP | null = null;
  private metadata: Map<string, any> = new Map();
  private indexPath: string;
  private metadataPath: string;
  private dimension: number;
  private initialized: boolean = false;

  constructor() {
    this.indexPath = config.database.faissIndexPath;
    this.metadataPath = path.join(
      path.dirname(this.indexPath),
      "metadata.json"
    );
    this.dimension = config.embeddings.dimension;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await fs.mkdir(path.dirname(this.indexPath), { recursive: true });

      try {
        await fs.access(this.indexPath);
        this.index = faiss.IndexFlatIP.read(this.indexPath);
        const metadataContent = await fs.readFile(this.metadataPath, "utf-8");
        const metadataArray = JSON.parse(metadataContent);
        this.metadata = new Map(metadataArray);
        console.log(
          `Loaded existing FAISS index with ${this.index.ntotal()} vectors`
        );
      } catch {
        this.index = new faiss.IndexFlatIP(this.dimension);
        console.log("Created new FAISS index");
      }

      this.initialized = true;
    } catch (error) {
      console.error("Error initializing vector store:", error);
      throw error;
    }
  }

  async addVectors(chunks: ReviewChunk[]): Promise<void> {
    if (!this.index) throw new Error("Vector store not initialized");

    const vectors: number[][] = [];
    const ids: string[] = [];

    for (const chunk of chunks) {
      if (!chunk.embedding) continue;

      const normalized = this.normalizeVector(chunk.embedding);
      vectors.push(normalized);
      ids.push(chunk.id);

      this.metadata.set(chunk.id, {
        productId: chunk.productId,
        asin: chunk.asin,
        content: chunk.content,
        metadata: chunk.metadata,
      });
    }

    if (vectors.length === 0) return;

    const flatVectors = vectors.flat();
    this.index.add(flatVectors);

    await this.save();
    console.log(`Added ${vectors.length} vectors to index`);
  }

  async search(
    queryEmbedding: number[],
    topK: number = config.search.topK
  ): Promise<VectorSearchResult[]> {
    if (!this.index) throw new Error("Vector store not initialized");

    const normalizedQuery = this.normalizeVector(queryEmbedding);
    const totalVectors = this.index.ntotal();
    const k = Math.min(topK, totalVectors);

    console.log(`[VectorStore] Search: ${totalVectors} total vectors, requesting top ${topK}, will search ${k}`);

    if (k === 0) {
      console.log(`[VectorStore] WARNING: No vectors in index!`);
      return [];
    }

    const results = this.index.search(normalizedQuery, k);
    console.log(`[VectorStore] Raw search returned ${results.labels.length} results`);

    const searchResults: VectorSearchResult[] = [];
    for (let i = 0; i < k; i++) {
      const idx = results.labels[i];
      const distance = results.distances[i];
      const metadata = this.getMetadataByIndex(idx);

      if (metadata) {
        searchResults.push({
          id: metadata.id || `idx_${idx}`,
          distance,
          metadata,
        });
      }
    }

    console.log(`[VectorStore] Found ${searchResults.length} results with metadata`);
    
    // Log top result distance for debugging
    if (searchResults.length > 0) {
      console.log(`[VectorStore] Top result distance: ${searchResults[0].distance.toFixed(4)}`);
    }

    // Filter by similarity threshold - be more lenient if we have few results
    const filtered = searchResults.filter((r) => r.distance >= config.search.minSimilarity);
    console.log(`[VectorStore] After similarity filter (>=${config.search.minSimilarity}): ${filtered.length} results`);
    
    // If filtered results are too few, return more results
    if (filtered.length < 3 && searchResults.length > filtered.length) {
      console.log(`[VectorStore] Too few results after filter, returning top ${Math.min(10, searchResults.length)}`);
      return searchResults.slice(0, 10);
    }
    
    return filtered;
  }

  async save(): Promise<void> {
    if (!this.index) return;

    try {
      this.index.write(this.indexPath);

      const metadataArray = Array.from(this.metadata.entries());
      await fs.writeFile(
        this.metadataPath,
        JSON.stringify(metadataArray, null, 2)
      );
    } catch (error) {
      console.error("Error saving vector store:", error);
    }
  }

  getStats(): { totalVectors: number; dimension: number } {
    return {
      totalVectors: this.index?.ntotal() || 0,
      dimension: this.dimension,
    };
  }

  private getMetadataByIndex(index: number): any | null {
    const entries = Array.from(this.metadata.entries());
    if (index >= 0 && index < entries.length) {
      const [id, metadata] = entries[index];
      return { id, ...metadata };
    }
    return null;
  }

  private normalizeVector(vector: number[]): number[] {
    const magnitude = Math.sqrt(
      vector.reduce((sum, val) => sum + val * val, 0)
    );
    if (magnitude === 0) return vector;
    return vector.map((val) => val / magnitude);
  }
}
