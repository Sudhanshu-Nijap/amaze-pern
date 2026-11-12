const express = require('express');
const router = express.Router();
const aiService = require('../services/ai.service');
const { query } = require('../services/db.service');
const { requireAuth } = require('../middleware/auth.middleware');

router.post('/', requireAuth, async (req, res) => {
  const { message } = req.body;
  const user = req.user;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  try {
    const userId = user.id || user.djangoId;

    // 1. Fetch tracked products for this user directly from PostgreSQL
    const trackedRes = await query(
      `SELECT p.id, p.asin, p.title, p.current_price, p.rating, p.stock_status, 
              p.sentiment_score, p.sentiment_verdict, t.target_price, t.added_at
       FROM scraper_trackedproduct t
       JOIN scraper_product p ON t.product_id = p.id
       WHERE t.user_id = $1`,
      [userId]
    );

    // 2. Extract potential keywords from user query to search related products in the database
    const words = message.replace(/[^a-zA-Z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 2);
    let searchCondition = "";
    let searchParams = [];
    
    if (words.length > 0) {
      searchCondition = "WHERE " + words.map((_, idx) => `title ILIKE $${idx + 1}`).join(" OR ");
      searchParams = words.map(w => `%${w}%`);
    }

    const allDbProductsRes = await query(
      `SELECT id, asin, title, current_price, rating, stock_status, sentiment_score, sentiment_verdict 
       FROM scraper_product 
       ${searchCondition}
       ORDER BY last_scraped DESC LIMIT 8`,
      searchParams
    );

    // Also fetch bestsellers / top deals for additional relevant context
    const dealsRes = await query(
      `SELECT title, current_price FROM scraper_todaydeals ORDER BY id DESC LIMIT 5`
    );

    // 3. Assemble strict database context
    const contextSections = [];

    if (trackedRes.rows.length > 0) {
      const trackedText = trackedRes.rows.map((p, i) => 
        `Item ${i + 1}: "${p.title}" | Price: ₹${p.current_price} | User Target: ₹${p.target_price} | Stock: ${p.stock_status} | Rating: ${p.rating || 'N/A'} | Sentiment: ${p.sentiment_verdict || 'N/A'} (${p.sentiment_score || 'N/A'}/100)`
      ).join("\n");
      contextSections.push(`[USER TRACKED PRODUCTS IN DATABASE]:\n${trackedText}`);
    } else {
      contextSections.push(`[USER TRACKED PRODUCTS IN DATABASE]: None tracked currently.`);
    }

    if (allDbProductsRes.rows.length > 0) {
      const dbText = allDbProductsRes.rows.map((p, i) => 
        `Product ${i + 1}: "${p.title}" | ASIN: ${p.asin} | Price: ₹${p.current_price} | Rating: ${p.rating || 'N/A'} | Sentiment: ${p.sentiment_verdict || 'N/A'}`
      ).join("\n");
      contextSections.push(`[MATCHING PRODUCTS IN DATABASE]:\n${dbText}`);
    }

    if (dealsRes.rows.length > 0) {
      const dealsText = dealsRes.rows.map(d => `Deal: "${d.title}" - ₹${d.current_price}`).join("\n");
      contextSections.push(`[DATABASE DEALS]:\n${dealsText}`);
    }

    const productContext = contextSections.join("\n\n");

    // 4. Chat with Groq strictly grounded on Database context
    const aiResponse = await aiService.chatWithGroq(message, productContext);

    res.status(200).json({ reply: aiResponse });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Failed to generate chat response: " + error.message });
  }
});

module.exports = router;
