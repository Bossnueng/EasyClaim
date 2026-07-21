const express = require("express");
const cors = require("cors");
require("dotenv").config();
const userRoute = require("./src/routes/userRoute");
const roleRoute=require("./src/routes/roleRoute");
const itemRoute=require("./src/routes/itemRoute");
const claimRoute=require("./src/routes/claimRoute");
const agentRoute=require("./src/routes/agentRoute");
const loginRoute=require("./src/routes/loginRoute")
const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", userRoute);
app.use("/api",roleRoute);
app.use("/api",itemRoute);
app.use("/api",claimRoute);
app.use("/api",agentRoute);
app.use("/api",loginRoute);
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server Running : http://localhost:${PORT}`);
});