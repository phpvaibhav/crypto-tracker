require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

// Connect MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log(err));

const COIN_API_URL = "https://api.coingecko.com/api/v3/coins/markets";
const CURRENCY = "usd,inr";

io.on("connection", (socket) => {
    console.log("New client connected");

    const fetchPrices = async () => {
        try {
            const { data } = await axios.get(COIN_API_URL, {
                params: { vs_currency: "usd", order: "market_cap_desc", per_page: 10, page: 1 }
            });
            socket.emit("cryptoData", data);
        } catch (error) {
            console.error("Error fetching data", error);
        }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 10000);

    socket.on("disconnect", () => {
        clearInterval(interval);
        console.log("Client disconnected");
    });
});

server.listen(5000, () => console.log("Server running on port 5000"));
