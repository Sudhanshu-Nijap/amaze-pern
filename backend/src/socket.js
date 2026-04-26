let io;

module.exports = {
  init: (server) => {
    io = require("socket.io")(server, {
      cors: {
        origin: "*", // Adjust this for production
        methods: ["GET", "POST"]
      }
    });
    return io;
  },
  getIO: () => {
    if (!io) {
      // Return a mock object if IO is not initialized yet (to prevent crashes during tests)
      return { emit: () => {} };
    }
    return io;
  }
};
