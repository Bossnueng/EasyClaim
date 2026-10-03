let ioInstance = null;

const initClaimSocket = (io) => {
  ioInstance = io;

  io.on("connection", (socket) => {
    socket.on("join:staff", () => {
      socket.join("staff");
    });

    socket.on("join:claim", (claimId) => {
      socket.join(`claim:${claimId}`);
    });

    socket.on("disconnect", () => {});
  });
};

const getIO = () => {
  if (!ioInstance) {
    throw new Error("Socket.io is not initialized!");
  }
  return ioInstance;
};

module.exports = { initClaimSocket, getIO };