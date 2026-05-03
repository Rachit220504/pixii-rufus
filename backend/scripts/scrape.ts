import { DataPipeline } from "../src/services/dataPipeline";

const args = process.argv.slice(2);

function getArg(name: string): string | undefined {
  const arg = args.find((a) => a.startsWith(`--${name}=`));
  return arg?.split("=")[1];
}

async function main() {
  const keyword = getArg("keyword");
  const maxResults = parseInt(getArg("maxResults") || "5");

  if (!keyword) {
    console.log("Usage: npm run scrape -- --keyword=<keyword> --maxResults=5");
    console.log("Example: npm run scrape -- --keyword=magnesium supplement --maxResults=3");
    process.exit(1);
  }

  console.log(`🔍 Scraping Amazon for: ${keyword}`);
  console.log(`📊 Max results: ${maxResults}\n`);

  const pipeline = new DataPipeline();
  await pipeline.initialize();

  try {
    const result = await pipeline.scrapeAndProcess(keyword, maxResults);

    console.log("\n✅ Scraping complete!");
    console.log(`   Products: ${result.products.length}`);
    console.log(`   Reviews: ${result.reviews.length}`);
    console.log(`   Insights: ${result.insights.length}`);

    console.log("\n📦 Products:");
    result.products.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.title}`);
      console.log(`      ASIN: ${p.asin} | Price: $${p.price} | Rating: ${p.rating}/5`);
    });
  } catch (error) {
    console.error("Scraping failed:", error);
    process.exit(1);
  }

  process.exit(0);
}

main();
