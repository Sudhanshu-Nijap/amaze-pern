# Amaze - PERN Stack Product Tracker

Amaze is a comprehensive product tracking and scraping application built with the PERN (PostgreSQL, Express, React, Node.js) stack. It allows users to track product prices, receive alerts, and browse daily deals.

## 🚀 Features

- **Price Tracking**: Monitor Amazon product prices and receive email alerts when prices drop below your target.
- **Chrome Extension**: A companion browser extension that allows you to track products instantly while browsing Amazon.
- **Daily Deals & Bestsellers**: Stay updated with the latest deals and best-selling products.
- **Real-time Updates**: Socket.io integration for instant data synchronization.
- **Automated Scraper**: Background jobs to fetch fresh product data periodically (managed by Redis).

## 🛠️ Tech Stack

- **Frontend**: React (Vite), Tailwind CSS, Socket.io-client, React Router (Deployed on Vercel).
- **Backend**: Node.js, Express, Supabase (PostgreSQL), node-cron, Nodemailer, Socket.io (Deployed on Render).
- **Database**: Supabase (PostgreSQL).
- **Cache/Queue**: Redis (Render Key Value / Upstash).

## 📁 Project Structure

```text
amaze-pern/
├── backend/            # Express server, Supabase logic, and Scrapers
│   ├── src/
│   │   ├── controllers/# Route handlers
│   │   ├── jobs/       # Cron jobs (currently paused)
│   │   ├── services/   # Business logic (Scraper, Email, Supabase, Redis Queues)
│   │   └── socket.js   # Socket.io configuration
│   └── server.js       # Entry point
├── frontend/           # React application
│   ├── src/
│   │   ├── components/ # Reusable UI components
│   │   ├── pages/      # Page components
│   │   └── services/   # API and Socket services
│   └── index.html      # Entry HTML
├── chrome-extension/   # Browser extension to track products
│   ├── popup.js        # Extension logic (connects to deployed frontend URL)
│   └── manifest.json   # Extension configuration
└── .gitignore          # Root ignore file
```

## ⚙️ Setup & Installation (Local Development)

### 1. Prerequisites
- Node.js (v18+)
- npm or yarn
- Local Redis server (or an Upstash Redis URL)

### 2. Backend Setup
```bash
cd backend
npm install
```
Create a `.env` file in the `backend/` directory with the following variables:
```env
PORT=5000
DATABASE_URL=your_postgres_connection_string
JWT_SECRET=your_jwt_secret
SCRAPERAPI_KEY=your_scraper_api_key
REDIS_URL=your_redis_connection_url
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
DEFAULT_FROM_EMAIL=your_email@gmail.com
```

### 3. Frontend Setup
```bash
cd frontend
npm install
```
Create a `.env` file in the `frontend/` directory:
```env
VITE_API_URL=http://localhost:5000/api
```

## 🏃 Running the Application

### Start Backend
```bash
cd backend
npm run dev
```

### Start Frontend
```bash
cd frontend
npm run dev
```

The application will be available at `http://localhost:5173` (Frontend) and `http://localhost:5000` (Backend).

## 🌍 Deployments

- **Frontend:** Hosted on [Vercel](https://amaze-omega.vercel.app/).
- **Backend:** Hosted on Render as a Web Service.
- **Redis:** Hosted on Render as a Key Value Service.

## 🕒 Scheduled Jobs
The backend includes cron jobs for periodic price checking and daily data scraping. 
> [!NOTE]
> Currently, the scheduler is **disabled** in `backend/src/jobs/cron.js`. To re-enable it, uncomment the `cron.schedule` calls.

## 📄 License
ISC
