const cron = require("node-cron");
const scraperService = require("../services/scraper.service");
const supabase = require("../services/supabase.service");
const emailService = require("../services/email.service");

const socket = require("../socket");

const checkPrices = async () => {
  console.log("Checking Tracked Products prices and sending notifications...");
  try {
    // 1. Get all tracked products joined with product info and user emails
    const { data: trackedItems, error } = await supabase
      .from("scraper_trackedproduct")
      .select(`
        target_price,
        scraper_product ( id, title, current_price, amazon_url ),
        scraper_customuser ( email )
      `);

    if (error) throw error;

    for (const item of trackedItems) {
      const product = item.scraper_product;
      const user = item.scraper_customuser;

      if (!product || !user) continue;

      // Scrape fresh price
      const productData = await scraperService.scrapeProduct(product.amazon_url);

      if (!productData.error) {
        // Clean and parse the new price (remove commas and non-numeric chars)
        const rawPrice = String(productData.current_price).replace(/[^0-9.]/g, '');
        const newPrice = parseFloat(rawPrice) || product.current_price;

        // Update product price in DB
        await supabase.from("scraper_product").update({
          current_price: newPrice,
          rating: productData.rating,
          stock_status: productData.stock_status ? "In Stock" : "Out of Stock",
          last_scraped: new Date(),
        }).eq("id", product.id);

        // Check for price drop
        console.log(`Checking price for ${user.email}: Current ${newPrice}, Target ${item.target_price}`);
        if (newPrice <= item.target_price) {
          const subject = `Price Drop Alert: ${product.title}`;
          const message = `The price for '${product.title}' has dropped to ₹${newPrice} (your target was ₹${item.target_price}).\n\nView at Amazon: ${product.amazon_url}`;

          await emailService.sendEmail(user.email, subject, message);
          console.log(`Notification sent to ${user.email} for ${product.title}`);
        }
      }
    }
    console.log("Finished checking Tracked Products prices.");
    socket.getIO().emit("dataUpdated", { type: "prices" });
  } catch (error) {
    console.error("Cron Error:", error);
  }
};

const scrapeDailyData = async () => {
  console.log("Running Daily Deals and Bestsellers Scraper...");
  try {
    const deals = await scraperService.getTodayDeals(0, 20);
    for (const deal of deals) {
      await supabase.from("scraper_todaydeals").upsert({
        title: deal.title,
        current_price: deal.current_price,
        image_url: deal.image_url,
        product_url: deal.product_url,
        scraped_at: new Date()
      }, { onConflict: "product_url" });
    }

    const bestsellers = await scraperService.getBestsellers(0, 20);
    for (const bs of bestsellers) {
      await supabase.from("scraper_bestseller").upsert({
        title: bs.title,
        current_price: bs.current_price,
        image_url: bs.image_url,
        product_url: bs.product_url,
        scraped_at: new Date()
      }, { onConflict: "product_url" });
    }
    console.log("Finished Daily Deals and Bestsellers Scraper.");
    socket.getIO().emit("dataUpdated", { type: "daily" });
  } catch (error) {
    console.error("Cron Error:", error);
  }
};

// Runs every day at 8:00 AM
// cron.schedule("0 8 * * *", scrapeDailyData);

// Runs every 4 hours to check tracked products prices
// cron.schedule("0 */4 * * *", checkPrices);

module.exports = { cron, checkPrices, scrapeDailyData };
