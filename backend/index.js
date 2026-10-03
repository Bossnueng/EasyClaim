const express = require("express");
const cors = require("cors");
const path = require("path");

require("dotenv").config();
const userRoute = require("./src/routes/userRoute");
const roleRoute = require("./src/routes/roleRoute");
const itemRoute = require("./src/routes/itemRoute");
const claimRoute = require("./src/routes/claimRoute");
const agentRoute = require("./src/routes/agentRoute");
const loginRoute = require("./src/routes/loginRoute");
const deliveryRoute = require("./src/routes/deliveryRoute");

const app = express();

const http = require("http");
const { Server } = require("socket.io");
const { initClaimSocket } = require("./socket/claimSocket");
const server = http.createServer(app);

// ตั้งค่า Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "*",
    credentials: true,
  },
});

// Initialize Socket.IO
initClaimSocket(io);

app.use(cors());
app.use(express.json());

app.use("/uploads", express.static(path.join(__dirname,"src", "uploads")));

app.use("/api", userRoute);
app.use("/api", roleRoute);
app.use("/api", itemRoute);
app.use("/api", claimRoute);
app.use("/api", agentRoute);
app.use("/api", loginRoute);
app.use("/api", deliveryRoute);

const PORT = process.env.PORT || 3000;
/*
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server Running on port ${PORT} (Binding to 0.0.0.0) is connected to DB: ${process.env.DB_DATABASE}`);
});
*/

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server Running on port ${PORT} with Socket.IO initialized. Connected to DB: ${process.env.DB_DATABASE}`);
});