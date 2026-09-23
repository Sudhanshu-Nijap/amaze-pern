const { Kafka } = require('kafkajs');
const { query } = require('./db.service');
const emailService = require('./email.service');
const socket = require('../socket');

const kafka = new Kafka({
  clientId: 'amaze-backend',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
});

const producer = kafka.producer();

const publish = async (topic, message) => {
  try {
    await producer.send({
      topic,
      messages: [{ value: JSON.stringify(message) }],
    });
    console.log(`[Kafka Producer] Message sent to topic ${topic}`);
  } catch (error) {
    console.error(`[Kafka Producer] Error sending message:`, error);
  }
};

const startConsumers = async () => {
  // Consumer for Database Updates
  const dbConsumer = kafka.consumer({ groupId: 'db-group' });
  await dbConsumer.connect();
  await dbConsumer.subscribe({ topic: 'product-updates', fromBeginning: false });

  await dbConsumer.run({
    eachMessage: async ({ message }) => {
      try {
        const payload = JSON.parse(message.value.toString());
        if (payload.event_type === 'PRICE_UPDATED') {
          console.log(`[Kafka db-consumer] Updating DB for ${payload.product_id}`);
          // Update product table
          await query(
            `UPDATE scraper_product 
             SET current_price = $1, stock_status = $2, last_scraped = $3
             WHERE id = $4`,
            [payload.new_price, payload.stock_status, new Date(), payload.product_id]
          );
          
          // Insert price history
          await query(
            `INSERT INTO scraper_pricehistory (user_id, product_id, price, timestamp)
             VALUES ($1, $2, $3, $4)`,
            [payload.user_id, payload.product_id, payload.new_price, new Date()]
          );
          
          const io = socket.getIO();
          if (io) io.emit("dataUpdated", { type: "prices" });
        }
      } catch (err) {
        console.error('[Kafka db-consumer] Error:', err);
      }
    },
  });

  // Consumer for Email Notifications
  const notificationConsumer = kafka.consumer({ groupId: 'notification-group' });
  await notificationConsumer.connect();
  await notificationConsumer.subscribe({ topic: 'product-updates', fromBeginning: false });

  await notificationConsumer.run({
    eachMessage: async ({ message }) => {
      try {
        const payload = JSON.parse(message.value.toString());
        if (payload.event_type === 'PRICE_UPDATED') {
          console.log(`[Kafka notification-consumer] Checking alerts for ${payload.product_id}`);
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
        console.error('[Kafka notification-consumer] Error:', err);
      }
    },
  });



  console.log('[Kafka] Consumers started successfully.');
};

const connectProducer = async () => {
  await producer.connect();
  console.log('[Kafka] Producer connected successfully.');
};

module.exports = {
  kafka,
  publish,
  startConsumers,
  connectProducer
};
