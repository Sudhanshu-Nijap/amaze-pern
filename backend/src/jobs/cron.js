const cron = require("node-cron");
const scraperService = require("../services/scraper.service");
const { query } = require("../services/db.service");
const emailService = require("../services/email.service");
const socket = require("../socket");

const checkPrices = async () => {
  console.log("Checking Tracked Products prices and sending notifications...");
  try {
    // 1. Get all tracked products joined with product info and user emails
    const trackedItemsRes = await query(`
      SELECT t.target_price,
             p.id as p_id, p.title, p.current_price, p.amazon_url,
             u.email
      FROM scraper_trackedproduct t
      JOIN scraper_product p ON t.product_id = p.id
      JOIN scraper_customuser u ON t.user_id = u.id
    `);

    const trackedItems = trackedItemsRes.rows.map(row => ({
      target_price: parseFloat(row.target_price),
      scraper_product: {
        id: row.p_id,
        title: row.title,
        current_price: parseFloat(row.current_price),
        amazon_url: row.amazon_url
      },
      scraper_customuser: {
        email: row.email
      }
    }));

    for (const item of trackedItems) {
      const product = item.scraper_product;
      const user = item.scraper_customuser;

      if (!product || !user) continue;

      // Scrape fresh price
      const productData = await scraperService.scrapeProduct(product.amazon_url);

      if (productData && !productData.error) {
        // Clean and parse the new price (remove commas and non-numeric chars)
        const rawPrice = String(productData.current_price).replace(/[^0-9.]/g, '');
        const newPrice = parseFloat(rawPrice) || product.current_price;

        // Update product price in DB
        await query(
          `UPDATE scraper_product 
           SET current_price = $1, rating = $2, stock_status = $3, last_scraped = $4
           WHERE id = $5`,
          [
            newPrice,
            productData.rating,
            productData.stock_status ? "In Stock" : "Out of Stock",
            new Date(),
            product.id
          ]
        );

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
      await query(
        `INSERT INTO scraper_todaydeals (title, current_price, image_url, product_url, scraped_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (product_url) DO UPDATE 
         SET title = EXCLUDED.title, current_price = EXCLUDED.current_price, image_url = EXCLUDED.image_url, scraped_at = EXCLUDED.scraped_at`,
        [deal.title, deal.current_price, deal.image_url, deal.product_url, new Date()]
      );
    }

    const bestsellers = await scraperService.getBestsellers(0, 20);
    for (const bs of bestsellers) {
      await query(
        `INSERT INTO scraper_bestseller (title, current_price, image_url, product_url, scraped_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (product_url) DO UPDATE 
         SET title = EXCLUDED.title, current_price = EXCLUDED.current_price, image_url = EXCLUDED.image_url, scraped_at = EXCLUDED.scraped_at`,
        [bs.title, bs.current_price, bs.image_url, bs.product_url, new Date()]
      );
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
