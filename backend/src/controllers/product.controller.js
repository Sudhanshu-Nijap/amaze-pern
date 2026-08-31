const { query } = require("../services/db.service");
const scraperService = require("../services/scraper.service");

// Matches 'amazon_product_view' (POST /search/)
const searchProduct = async (req, res) => {
  const { url: userInput } = req.body;
  if (!userInput) return res.status(400).json({ error: "Amazon URL is required" });

  try {
    // ASIN or URL validation
    const asinPattern = /^[A-Z0-9]{10}$/;
    const url = asinPattern.test(userInput) ? `https://www.amazon.in/dp/${userInput}` : userInput;

    const productData = await scraperService.scrapeProduct(url);
    if (productData && productData.error) return res.status(400).json(productData);

    res.status(200).json(productData);
  } catch (error) {
    res.status(500).json({ error: "Scraping failed: " + error.message });
  }
};

// Matches 'result' (GET /result/)
const getResult = async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "Invalid request. No product URL provided." });

  try {
    // Fetch product details from DB if available
    const productRes = await query("SELECT * FROM scraper_product WHERE amazon_url = $1 LIMIT 1", [url]);
    const product = productRes.rows[0];

    if (product) {
      // Fetch price history
      const priceRes = await query(
        "SELECT * FROM scraper_pricehistory WHERE product_id = $1 ORDER BY timestamp ASC",
        [product.id]
      );
      const priceHistory = priceRes.rows;

      return res.status(200).json({
        ...product,
        product_from_db: true,
        price_history: priceHistory || []
      });
    } else {
      // Otherwise, scrape them
      try {
        const productData = await scraperService.scrapeProduct(url);
        if (productData && productData.error) return res.status(400).json({ error: productData.error });

        return res.status(200).json({
          ...productData,
          product_from_db: false
        });
      } catch (scrapeError) {
        return res.status(500).json({ error: "Scraping failed: " + scrapeError.message });
      }
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Matches 'bestsellers_view'
const getBestsellers = async (req, res) => {
  const start = parseInt(req.query.start) || 0;
  const count = 20;

  try {
    // Check if products exist in DB
    const countRes = await query("SELECT COUNT(*) FROM scraper_bestseller");
    const productCount = parseInt(countRes.rows[0].count, 10);

    if (productCount === 0) {
      console.log("Database empty. Scraping new products...");
      try {
        const scrapedProducts = await scraperService.getBestsellers(0, 20);
        
        // Save scraped data efficiently
        if (scrapedProducts && scrapedProducts.length > 0) {
          for (const p of scrapedProducts) {
            await query(
              `INSERT INTO scraper_bestseller (title, current_price, image_url, product_url)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT (product_url) DO UPDATE 
               SET title = EXCLUDED.title, current_price = EXCLUDED.current_price, image_url = EXCLUDED.image_url, scraped_at = CURRENT_TIMESTAMP`,
              [p.title, p.current_price, p.image_url, p.product_url]
            );
          }
        }
      } catch (scrapeError) {
        console.error("Initial Bestseller Scrape Failed:", scrapeError.message);
      }
    }

    const dataRes = await query(
      "SELECT * FROM scraper_bestseller ORDER BY scraped_at DESC LIMIT $1 OFFSET $2",
      [count, start]
    );

    res.status(200).json(dataRes.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Matches 'today_view'
const getTodayDeals = async (req, res) => {
  const start = parseInt(req.query.start) || 0;
  const count = 20;

  try {
    const countRes = await query("SELECT COUNT(*) FROM scraper_todaydeals");
    const productCount = parseInt(countRes.rows[0].count, 10);

    if (productCount === 0) {
      console.log("Database empty. Scraping new Today's Deals...");
      try {
        const scrapedProducts = await scraperService.getTodayDeals(0, 20);
        
        if (scrapedProducts && scrapedProducts.length > 0) {
          for (const p of scrapedProducts) {
            await query(
              `INSERT INTO scraper_todaydeals (title, current_price, image_url, product_url)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT (product_url) DO UPDATE 
               SET title = EXCLUDED.title, current_price = EXCLUDED.current_price, image_url = EXCLUDED.image_url, scraped_at = CURRENT_TIMESTAMP`,
              [p.title, p.current_price, p.image_url, p.product_url]
            );
          }
        }
      } catch (scrapeError) {
        console.error("Initial Today's Deals Scrape Failed:", scrapeError.message);
      }
    }

    const dataRes = await query(
      "SELECT * FROM scraper_todaydeals ORDER BY scraped_at DESC LIMIT $1 OFFSET $2",
      [count, start]
    );

    res.status(200).json(dataRes.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Matches 'track_products_db'
const trackProduct = async (req, res) => {
  const { asin, title, image_url, amazon_url, current_price, rating, stock_status, desired_price } = req.body;
  const user = req.user;

  if (!user) return res.status(401).json({ error: "User not authenticated." });

  try {
    // 1. Get or Create Product
    const existingRes = await query("SELECT * FROM scraper_product WHERE asin = $1 LIMIT 1", [asin]);
    let product = existingRes.rows[0];

    const cleanPrice = parseFloat(String(current_price).replace(/[^0-9.]/g, '')) || 0;

    if (!product) {
      const insertRes = await query(
        `INSERT INTO scraper_product (asin, title, image_url, current_price, rating, stock_status, amazon_url, last_scraped)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          asin,
          title,
          image_url,
          cleanPrice,
          rating || "0 out of 5 stars",
          stock_status,
          amazon_url,
          new Date()
        ]
      );
      product = insertRes.rows[0];
    } else {
      // Update current price if changed
      if (parseFloat(product.current_price) !== cleanPrice) {
        const updateRes = await query(
          "UPDATE scraper_product SET current_price = $1 WHERE id = $2 RETURNING *",
          [cleanPrice, product.id]
        );
        product = updateRes.rows[0];
      }
    }

    // 2. Add product to TrackedProduct
    if (!user.djangoId) throw new Error("User record not found in database.");

    const trackedRes = await query(
      "SELECT * FROM scraper_trackedproduct WHERE user_id = $1 AND product_id = $2 LIMIT 1",
      [user.djangoId, product.id]
    );
    const existingTracked = trackedRes.rows[0];
    
    if (!existingTracked) {
      await query(
        "INSERT INTO scraper_trackedproduct (user_id, product_id, target_price, added_at) VALUES ($1, $2, $3, $4)",
        [
          user.djangoId,
          product.id,
          parseFloat(desired_price),
          new Date()
        ]
      );
    } else if (parseFloat(existingTracked.target_price) !== parseFloat(desired_price)) {
      await query(
        "UPDATE scraper_trackedproduct SET target_price = $1 WHERE id = $2",
        [parseFloat(desired_price), existingTracked.id]
      );
    }

    // 3. Save Price History
    await query(
      "INSERT INTO scraper_pricehistory (user_id, product_id, price, timestamp) VALUES ($1, $2, $3, $4)",
      [
        user.djangoId,
        product.id,
        parseFloat(desired_price),
        new Date()
      ]
    );

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Track Product Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Matches 'tracked_products_view'
const getTrackedProducts = async (req, res) => {
  const user = req.user;
  if (!user || !user.djangoId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const resRows = await query(
      `SELECT t.*, 
              p.id as p_id, p.asin, p.title, p.image_url, p.current_price, p.rating, p.stock_status, p.amazon_url, p.last_scraped
       FROM scraper_trackedproduct t
       JOIN scraper_product p ON t.product_id = p.id
       WHERE t.user_id = $1`,
      [user.djangoId]
    );

    const data = resRows.rows.map(row => ({
      id: row.id,
      user_id: row.user_id,
      product_id: row.product_id,
      target_price: row.target_price,
      added_at: row.added_at,
      product: {
        id: row.p_id,
        asin: row.asin,
        title: row.title,
        image_url: row.image_url,
        current_price: row.current_price,
        rating: row.rating,
        stock_status: row.stock_status,
        amazon_url: row.amazon_url,
        last_scraped: row.last_scraped
      }
    }));

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Matches 'remove_product_db'
const untrackProduct = async (req, res) => {
  const { asin } = req.params;
  const user = req.user;
  if (!user || !user.djangoId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const prodRes = await query("SELECT id FROM scraper_product WHERE asin = $1 LIMIT 1", [asin]);
    const product = prodRes.rows[0];
    if (!product) return res.status(404).json({ error: "Product not found" });

    await query(
      "DELETE FROM scraper_trackedproduct WHERE user_id = $1 AND product_id = $2",
      [user.djangoId, product.id]
    );

    res.status(200).json({ success: true, message: "Product removed successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  searchProduct,
  getResult,
  getBestsellers,
  getTodayDeals,
  trackProduct,
  getTrackedProducts,
  untrackProduct
};
