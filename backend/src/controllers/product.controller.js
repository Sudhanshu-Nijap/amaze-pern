const supabase = require("../services/supabase.service");
const scraperService = require("../services/scraper.service");

// Matches 'amazon_product_view' (POST /search/)
const searchProduct = async (req, res) => {
  const { url: userInput } = req.body;
  if (!userInput) return res.status(400).json({ error: "Amazon URL is required" });

  try {
    // ASIN or URL validation (Django logic)
    const asinPattern = /^[A-Z0-9]{10}$/;
    const url = asinPattern.test(userInput) ? `https://www.amazon.in/dp/${userInput}` : userInput;

    const productData = await scraperService.scrapeProduct(url);
    if (productData && productData.error) return res.status(400).json(productData);

    // This view in Django doesn't save to DB, it just returns data
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
    const { data: product } = await supabase
      .from("scraper_product")
      .select("*")
      .eq("amazon_url", url)
      .single();

    if (product) {
      // Fetch price history
      const { data: priceHistory } = await supabase
        .from("scraper_pricehistory")
        .select("*")
        .eq("product_id", product.id)
        .order("timestamp", { ascending: true });

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
    const { count: productCount, error: countError } = await supabase
      .from("scraper_bestseller")
      .select("*", { count: "exact", head: true });

    if (productCount === 0) {
      console.log("Database empty. Scraping new products...");
      try {
        const scrapedProducts = await scraperService.getBestsellers(0, 20);
        
        // Save scraped data efficiently
        if (scrapedProducts && scrapedProducts.length > 0) {
          await supabase.from("scraper_bestseller").insert(
            scrapedProducts.map(p => ({
              title: p.title,
              current_price: p.current_price,
              image_url: p.image_url,
              product_url: p.product_url
            }))
          );
        }
      } catch (scrapeError) {
        console.error("Initial Bestseller Scrape Failed:", scrapeError.message);
        // Continue to return empty data from DB instead of 500
      }
    }

    const { data, error } = await supabase
      .from("scraper_bestseller")
      .select("*")
      .order("scraped_at", { ascending: false })
      .range(start, start + count - 1);

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Matches 'today_view'
const getTodayDeals = async (req, res) => {
  const start = parseInt(req.query.start) || 0;
  const count = 20;

  try {
    const { count: productCount } = await supabase
      .from("scraper_todaydeals")
      .select("*", { count: "exact", head: true });

    if (productCount === 0) {
      console.log("Database empty. Scraping new Today's Deals...");
      try {
        const scrapedProducts = await scraperService.getTodayDeals(0, 20);
        
        if (scrapedProducts && scrapedProducts.length > 0) {
          await supabase.from("scraper_todaydeals").insert(
            scrapedProducts.map(p => ({
              title: p.title,
              current_price: p.current_price,
              image_url: p.image_url,
              product_url: p.product_url
            }))
          );
        }
      } catch (scrapeError) {
        console.error("Initial Today's Deals Scrape Failed:", scrapeError.message);
      }
    }

    const { data, error } = await supabase
      .from("scraper_todaydeals")
      .select("*")
      .order("scraped_at", { ascending: false })
      .range(start, start + count - 1);

    if (error) throw error;
    res.status(200).json(data);
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
    const { data: existingProduct } = await supabase
      .from("scraper_product")
      .select("*")
      .eq("asin", asin)
      .single();

    let product = existingProduct;

    if (!product) {
      const { data: newProduct, error: insertError } = await supabase
        .from("scraper_product")
        .insert({
          asin,
          title,
          image_url,
          current_price: parseFloat(String(current_price).replace(/[^0-9.]/g, '')) || 0,
          rating: rating || "0 out of 5 stars",
          stock_status,
          amazon_url,
          last_scraped: new Date()
        })
        .select()
        .single();
      
      if (insertError) throw insertError;
      product = newProduct;
    } else {
      // Update current price if changed
      if (product.current_price !== parseFloat(current_price)) {
        await supabase
          .from("scraper_product")
          .update({ current_price: parseFloat(current_price) })
          .eq("id", product.id);
      }
    }

    // 2. Add product to TrackedProduct
    const { data: existingTracked } = await supabase
      .from("scraper_trackedproduct")
      .select("*")
      .eq("user_id", user.djangoId)
      .eq("product_id", product.id)
      .single();
    
    if (!user.djangoId) throw new Error("User record not found in database.");

    if (!existingTracked) {
      await supabase
        .from("scraper_trackedproduct")
        .insert({
          user_id: user.djangoId,
          product_id: product.id,
          target_price: parseFloat(desired_price),
          added_at: new Date()
        });
    } else if (existingTracked.target_price !== parseFloat(desired_price)) {
      await supabase
        .from("scraper_trackedproduct")
        .update({ target_price: parseFloat(desired_price) })
        .eq("id", existingTracked.id);
    }

    // 3. Save Price History (Django logic)
    await supabase.from("scraper_pricehistory").insert({
      user_id: user.djangoId,
      product_id: product.id,
      price: parseFloat(desired_price),
      timestamp: new Date()
    });

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
    const { data, error } = await supabase
      .from("scraper_trackedproduct")
      .select("*, scraper_product(*)")
      .eq("user_id", user.djangoId);

    if (error) throw error;
    res.status(200).json(data.map(item => ({ ...item, product: item.scraper_product })));
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
    const { data: product } = await supabase.from("scraper_product").select("id").eq("asin", asin).single();
    if (!product) return res.status(404).json({ error: "Product not found" });

    const { error } = await supabase
      .from("scraper_trackedproduct")
      .delete()
      .eq("user_id", user.djangoId)
      .eq("product_id", product.id);

    if (error) throw error;
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
