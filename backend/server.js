require("dotenv").config();
const app = require("./src/app");
const http = require("http");
const socket = require("./src/socket");

const server = http.createServer(app);
socket.init(server);

require("./src/jobs/cron"); // Start cron jobs

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
