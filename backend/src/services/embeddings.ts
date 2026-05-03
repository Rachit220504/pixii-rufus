import { config } from "../utils/config";
import type { Review, ReviewChunk } from "../../../src/types";
import { GeminiService } from "./gemini";

export class EmbeddingService {
  private gemini: GeminiService;
  private chunkSize: number;
  private chunkOverlap: number;

  constructor() {
    this.gemini = new GeminiService();
    this.chunkSize = config.embeddings.chunkSize;
    this.chunkOverlap = config.embeddings.chunkOverlap;
  }

  async chunkReview(review: Review): Promise<ReviewChunk[]> {
    const chunks: ReviewChunk[] = [];
    const content = review.content || "";
    const title = review.title || "";

    if (content.length <= this.chunkSize) {
      chunks.push({
        id: `${review.id}_0`,
        productId: review.productId,
        asin: review.asin,
        content: `${title}. ${content}`.trim(),
        metadata: {
          reviewId: review.id,
          rating: review.rating,
          sentiment: review.sentiment || this.detectSentiment(review.rating),
          keywords: this.extractKeywords(content),
        },
      });
    } else {
      const sentences = content.match(/[^.!?]+[.!?]+/g) || [content];
      let currentChunk = "";
      let chunkIndex = 0;

      for (const sentence of sentences) {
        if ((currentChunk + sentence).length <= this.chunkSize) {
          currentChunk += sentence + " ";
        } else {
          if (currentChunk.trim()) {
            chunks.push({
              id: `${review.id}_${chunkIndex}`,
              productId: review.productId,
              asin: review.asin,
              content: `${title}. ${currentChunk.trim()}`.trim(),
              metadata: {
                reviewId: review.id,
                rating: review.rating,
                sentiment: review.sentiment || this.detectSentiment(review.rating),
                keywords: this.extractKeywords(currentChunk),
              },
            });
            chunkIndex++;
          }
          currentChunk = sentence + " ";
        }
      }

      if (currentChunk.trim()) {
        chunks.push({
          id: `${review.id}_${chunkIndex}`,
          productId: review.productId,
          asin: review.asin,
          content: `${title}. ${currentChunk.trim()}`.trim(),
          metadata: {
            reviewId: review.id,
            rating: review.rating,
            sentiment: review.sentiment || this.detectSentiment(review.rating),
            keywords: this.extractKeywords(currentChunk),
          },
        });
      }
    }

    return chunks;
  }

  async processReviews(reviews: Review[]): Promise<ReviewChunk[]> {
    const allChunks: ReviewChunk[] = [];

    for (const review of reviews) {
      const chunks = await this.chunkReview(review);
      allChunks.push(...chunks);
    }

    const chunksWithEmbeddings = await this.generateEmbeddingsForChunks(allChunks);
    return chunksWithEmbeddings;
  }

  async generateEmbeddingsForChunks(chunks: ReviewChunk[]): Promise<ReviewChunk[]> {
    const batchSize = 5;
    const results: ReviewChunk[] = [];

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const texts = batch.map((chunk) => chunk.content);

      try {
        const embeddings = await this.gemini.generateBatchEmbeddings(texts);

        for (let j = 0; j < batch.length; j++) {
          results.push({
            ...batch[j],
            embedding: embeddings[j],
          });
        }
      } catch (error) {
        console.error("Error generating embeddings for batch:", error);
        for (const chunk of batch) {
          results.push({
            ...chunk,
            embedding: this.generateSimpleEmbedding(chunk.content),
          });
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    return results;
  }

  private detectSentiment(rating: number): "positive" | "negative" | "neutral" {
    if (rating >= 4) return "positive";
    if (rating <= 2) return "negative";
    return "neutral";
  }

  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
      "have", "has", "had", "do", "does", "did", "will", "would", "could",
      "should", "may", "might", "must", "shall", "can", "need", "dare",
      "ought", "used", "to", "of", "in", "for", "on", "with", "at", "by",
      "from", "as", "into", "through", "during", "before", "after", "above",
      "below", "between", "under", "and", "but", "or", "yet", "so", "if",
      "because", "although", "though", "while", "where", "when", "that",
      "which", "who", "whom", "whose", "what", "this", "these", "those",
      "i", "you", "he", "she", "it", "we", "they", "me", "him", "her",
      "us", "them", "my", "your", "his", "her", "its", "our", "their",
    ]);

    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w));

    const wordFreq: Record<string, number> = {};
    for (const word of words) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }

    return Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  private generateSimpleEmbedding(text: string): number[] {
    const hash = text.split("").reduce((acc, char) => {
      return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
    }, 0);

    const embedding: number[] = [];
    const dimension = config.embeddings.dimension;
    for (let i = 0; i < dimension; i++) {
      const value = Math.sin(hash * (i + 1)) * Math.cos(hash * (i + 2));
      embedding.push(value);
    }

    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map((val) => val / magnitude);
  }
}
