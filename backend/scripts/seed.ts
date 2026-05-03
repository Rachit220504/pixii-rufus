import { DataPipeline } from "../src/services/dataPipeline";

const KEYWORDS = [
  "magnesium supplement",
  "mechanical keyboard",
  "protein powder",
];

async function seed() {
  console.log("🌱 Seeding database with sample data...\n");

  const pipeline = new DataPipeline();
  await pipeline.initialize();

  for (const keyword of KEYWORDS) {
    console.log(`\n📦 Processing: ${keyword}`);
    try {
      const result = await pipeline.scrapeAndProcess(keyword, 3);
      console.log(
        `✅ ${keyword}: ${result.products.length} products, ${result.reviews.length} reviews, ${result.insights.length} insights`
      );
    } catch (error) {
      console.error(`❌ Failed to process ${keyword}:`, error);
    }
  }

  console.log("\n📊 Final Statistics:");
  const stats = await pipeline.getStats();
  console.log(`   Products: ${stats.products}`);
  console.log(`   Reviews: ${stats.reviews}`);
  console.log(`   Vectors: ${stats.vectors}`);
  console.log(`   Insights: ${stats.insights}`);

  console.log("\n✨ Seeding complete!");
  process.exit(0);
}

seed().catch((error) => {
  console.error("Seeding failed:", error);
  process.exit(1);
});
