# Amaze Backend

This is the Node.js/Express backend for the Amaze product tracker. It handles web scraping, price tracking, email notifications, and Supabase integration.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables in `.env`.
3. Run the development server:
   ```bash
   npm run dev
   ```

## Key Components

- **Jobs**: Automated tasks using `node-cron` for periodic scraping (currently disabled).
- **Services**:
  - `scraper.service`: Scrapes Amazon data.
  - `supabase.service`: Database operations.
  - `email.service`: Sends alerts via Nodemailer.
- **Socket**: Real-time updates to the frontend.

For full project documentation, please refer to the [Root README](../README.md).
