const { Queue, Worker } = require('bullmq');
const scraperService = require('./scraper.service');
const aiService = require('./ai.service');

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

module.exports = {
  scrapeQueue
};
