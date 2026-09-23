const { query } = require("./src/services/db.service");
const aiService = require("./src/services/ai.service");
const qdrantService = require("./src/services/qdrant.service");

const syncQdrant = async () => {
  try {
    console.log("Fetching products from DB for Qdrant sync...");
    const res = await query("SELECT * FROM scraper_product");
    const products = res.rows;
    console.log(`Found ${products.length} products. Processing...`);
    
    for (const product of products) {
      // Fetch price history to generate good chunks
      const historyRes = await query("SELECT price, timestamp FROM scraper_pricehistory WHERE product_id = $1 ORDER BY timestamp DESC LIMIT 10", [product.id]);
      const history = historyRes.rows;
      
      const chunks = aiService.generateProductChunks(product, history);
      
      const embeddings = [];
      for (const chunk of chunks) {
        const emb = await aiService.generateEmbedding(chunk.content);
        embeddings.push(emb);
      }
      
      await qdrantService.upsertChunks(product.id, product.title, chunks, embeddings);
      console.log(`Successfully embedded and upserted product ${product.id}`);
    }
    
    console.log("Qdrant sync complete!");
    process.exit(0);
  } catch (error) {
    console.error("Qdrant sync failed:", error);
    process.exit(1);
  }
};

syncQdrant();
