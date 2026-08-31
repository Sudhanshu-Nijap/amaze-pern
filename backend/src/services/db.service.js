const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;

const isRemoteDb = connectionString && !connectionString.includes("localhost") && !connectionString.includes("127.0.0.1");
const useSsl = process.env.DATABASE_SSL === "true" || (process.env.DATABASE_SSL !== "false" && isRemoteDb);

const pool = new Pool({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: false } : false
});

const query = (text, params) => pool.query(text, params);

const initDb = async () => {
  console.log("Initializing database tables...");
  
  const createTablesQuery = `
    CREATE TABLE IF NOT EXISTS scraper_customuser (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      first_name VARCHAR(150) DEFAULT '',
      last_name VARCHAR(150) DEFAULT '',
      is_active BOOLEAN DEFAULT TRUE,
      is_staff BOOLEAN DEFAULT FALSE,
      is_superuser BOOLEAN DEFAULT FALSE,
      last_login TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS scraper_product (
      id SERIAL PRIMARY KEY,
      asin VARCHAR(10) UNIQUE NOT NULL,
      title TEXT,
      image_url TEXT,
      current_price NUMERIC(10, 2),
      rating VARCHAR(100),
      stock_status VARCHAR(100),
      amazon_url TEXT,
      last_scraped TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS scraper_trackedproduct (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES scraper_customuser(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES scraper_product(id) ON DELETE CASCADE,
      target_price NUMERIC(10, 2),
      added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_user_product UNIQUE (user_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS scraper_pricehistory (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES scraper_customuser(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES scraper_product(id) ON DELETE CASCADE,
      price NUMERIC(10, 2),
      timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS scraper_todaydeals (
      id SERIAL PRIMARY KEY,
      title TEXT,
      current_price NUMERIC(10, 2),
      image_url TEXT,
      product_url TEXT UNIQUE NOT NULL,
      scraped_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS scraper_bestseller (
      id SERIAL PRIMARY KEY,
      title TEXT,
      current_price NUMERIC(10, 2),
      image_url TEXT,
      product_url TEXT UNIQUE NOT NULL,
      scraped_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    await pool.query(createTablesQuery);
    console.log("Database tables initialized successfully.");
  } catch (error) {
    console.error("Database initialization failed:", error.message);
    throw error;
  }
};

module.exports = {
  pool,
  query,
  initDb
};
