const { Queue, Worker } = require('bullmq');
const scraperService = require('./scraper.service');
const aiService = require('./ai.service');
const { query } = require('./db.service');
const emailService = require('./email.service');

const connection = {
  host: process.env.REDIS_HOST || 'redis',
  port: process.env.REDIS_PORT || 6379,
};

const scrapeQueue = new Queue('scrape-jobs', { connection });

const scrapeWorker = new Worker('scrape-jobs', async (job) => {
  const { url } = job.data;
  console.log(`[Worker] Starting job ${job.id} for URL: ${url}`);
  
  // Call scraper
  const productData = await scraperService.scrapeProduct(url);
  
  if (productData && productData.error) {
    throw new Error(productData.error);
  }
  
  // Run sentiment analysis immediately in the background
  if (productData) {
    try {
      const sentimentResult = await aiService.analyzeReviews(productData.reviews || []);
      productData.sentiment = sentimentResult;
    } catch (err) {
      console.error(`[Worker] Error analyzing sentiment for job ${job.id}:`, err);
    }
  }

  return productData;
}, { connection });

const socket = require('../socket');

scrapeWorker.on('completed', (job, returnvalue) => {
  console.log(`[Worker] Job ${job.id} completed successfully.`);
  const io = socket.getIO();
  if (io) {
    io.emit('job_completed', { jobId: job.id, data: returnvalue, status: 'completed' });
  }
});

scrapeWorker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job.id} failed with error: ${err.message}`);
  const io = socket.getIO();
  if (io) {
    io.emit('job_completed', { jobId: job.id, error: err.message, status: 'failed' });
  }
});

// --- Cron Scraping Queue & Worker ---
const cronScrapeQueue = new Queue('cron-scrape-jobs', { connection });

const cronScrapeWorker = new Worker('cron-scrape-jobs', async (job) => {
  const { amazon_url, product_id, title, user_id, email, target_price, old_stock_status, old_current_price } = job.data;
  console.log(`[Cron Worker] Scraping ${title} for ${email}`);
  
  const productData = await scraperService.scrapeProduct(amazon_url);
  if (productData && productData.error) {
    throw new Error(productData.error);
  }

  const rawPrice = String(productData.current_price).replace(/[^0-9.]/g, '');
  const newPrice = parseFloat(rawPrice) || old_current_price;

  // Publish event to Kafka instead of doing direct DB/Email writes
  const kafkaService = require('./kafka.service');
  await kafkaService.publish('product-updates', {
    event_type: 'PRICE_UPDATED',
    product_id,
    new_price,
    stock_status: productData.stock_status ? "In Stock" : "Out of Stock",
    user_id,
    target_price,
    old_stock_status,
    title,
    email,
    amazon_url,
    image_url: productData.image_url,
    rating: productData.rating
  });

  return productData;
}, { connection, concurrency: 5 }); // Process up to 5 concurrent scrapes

cronScrapeWorker.on('completed', (job) => {
  const io = socket.getIO();
  if (io) io.emit("dataUpdated", { type: "prices" });
});

cronScrapeWorker.on('failed', (job, err) => {
  console.error(`[Cron Worker] Job ${job.id} failed: ${err.message}`);
});

module.exports = {
  scrapeQueue,
  cronScrapeQueue
};
