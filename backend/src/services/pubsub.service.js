const Redis = require('ioredis');
const { query } = require('./db.service');
const emailService = require('./email.service');
const socket = require('../socket');

// Use REDIS_URL if provided, else construct from REDIS_HOST/REDIS_PORT
const redisConfig = process.env.REDIS_URL 
  ? process.env.REDIS_URL 
  : { host: process.env.REDIS_HOST || 'redis', port: process.env.REDIS_PORT || 6379 };

const pub = new Redis(redisConfig);
const sub = new Redis(redisConfig);

const publish = async (topic, message) => {
  try {
    await pub.publish(topic, JSON.stringify(message));
    console.log(`[Redis Pub/Sub] Message sent to topic ${topic}`);
  } catch (error) {
    console.error(`[Redis Pub/Sub] Error sending message:`, error);
  }
};

const startConsumers = async () => {
  // Subscribe to the topic
  await sub.subscribe('product-updates', (err, count) => {
    if (err) {
      console.error('[Redis Pub/Sub] Failed to subscribe: %s', err.message);
    } else {
      console.log(`[Redis Pub/Sub] Subscribed successfully! Currently listening to ${count} channels.`);
    }
  });

  // Listen for messages
  sub.on('message', async (channel, messageStr) => {
    if (channel === 'product-updates') {
      try {
        const payload = JSON.parse(messageStr);
        if (payload.event_type === 'PRICE_UPDATED') {
          console.log(`[Redis Pub/Sub] Received PRICE_UPDATED for ${payload.product_id}`);
          
          // 1. Database Update Logic
          await query(
            `UPDATE scraper_product 
             SET current_price = $1, stock_status = $2, last_scraped = $3
             WHERE id = $4`,
            [payload.new_price, payload.stock_status, new Date(), payload.product_id]
          );
          
          await query(
            `INSERT INTO scraper_pricehistory (user_id, product_id, price, timestamp)
             VALUES ($1, $2, $3, $4)`,
            [payload.user_id, payload.product_id, payload.new_price, new Date()]
          );
          
          const io = socket.getIO();
          if (io) io.emit("dataUpdated", { type: "prices" });

          // 2. Notification Logic
          const { new_price, target_price, old_stock_status, stock_status, title, email, amazon_url } = payload;
          
          if (new_price <= target_price) {
            const subject = `Price Drop Alert: ${title}`;
            const msg = `The price for '${title}' has dropped to ₹${new_price} (your target was ₹${target_price}).\n\nView at Amazon: ${amazon_url}`;
            await emailService.sendEmail(email, subject, msg);
          }

          const isCurrentlyInStock = stock_status === "In Stock";
          const wasOutofStock = old_stock_status && old_stock_status.toLowerCase() === "out of stock";
          if (wasOutofStock && isCurrentlyInStock) {
            const subject = `🚨 Back in Stock Alert: ${title}`;
            const msg = `Good news! '${title}' is now back in stock at ₹${new_price}.\n\nView at Amazon: ${amazon_url}`;
            await emailService.sendEmail(email, subject, msg);
          }
        }
      } catch (err) {
         console.error('[Redis Pub/Sub] Error processing message:', err);
      }
    }
  });

  console.log('[Redis Pub/Sub] Consumers started successfully.');
};

const connectProducer = async () => {
  // Redis pub/sub connects automatically, keeping the interface same as Kafka's
  console.log('[Redis Pub/Sub] Producer ready.');
};

module.exports = {
  publish,
  startConsumers,
  connectProducer
};
