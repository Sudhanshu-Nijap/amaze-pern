const cron = require("node-cron");
const scraperService = require("../services/scraper.service");
const { query } = require("../services/db.service");
const emailService = require("../services/email.service");
const socket = require("../socket");
const { cronScrapeQueue } = require("../services/queue.service");

const checkPrices = async () => {
  console.log("Dispatching Tracked Products to background scraper queue...");
  try {
    // 1. Get all tracked products joined with product info and user emails
    const trackedItemsRes = await query(`
      SELECT t.target_price,
             p.id as p_id, p.title, p.current_price, p.amazon_url, p.stock_status,
             u.id as u_id, u.email
      FROM scraper_trackedproduct t
      JOIN scraper_product p ON t.product_id = p.id
      JOIN scraper_customuser u ON t.user_id = u.id
    `);

    const jobs = trackedItemsRes.rows.map(row => {
      return {
        name: 'cron-scrape',
        data: {
          amazon_url: row.amazon_url,
          product_id: row.p_id,
          title: row.title,
          user_id: row.u_id,
          email: row.email,
          target_price: parseFloat(row.target_price),
          old_stock_status: row.stock_status,
          old_current_price: parseFloat(row.current_price)
        }
      };
    });

    if (jobs.length > 0) {
      await cronScrapeQueue.addBulk(jobs);
      console.log(`Successfully dispatched ${jobs.length} jobs to cronScrapeQueue.`);
    } else {
      console.log("No tracked products to dispatch.");
    }
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
cron.schedule("0 8 * * *", scrapeDailyData);

// Runs every 4 hours to check tracked products prices
cron.schedule("0 */4 * * *", checkPrices);

module.exports = { cron, checkPrices, scrapeDailyData };
