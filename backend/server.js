require("dotenv").config();
const app = require("./src/app");
const http = require("http");
const socket = require("./src/socket");
const { initDb } = require("./src/services/db.service");

const server = http.createServer(app);
socket.init(server);

require("./src/jobs/cron"); // Start cron jobs

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await initDb();
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server due to database initialization error:", error);
    process.exit(1);
  }
};

startServer();
