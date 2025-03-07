require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const http = require("http");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const Redis = require("ioredis");
const Coin = require("./models/Coin");
const SearchHistory = require("./models/SearchHistory");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Redis setup
const redis = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379");

// Middleware
app.use(cors());
app.use(express.json());

// Connect MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log(" Connected"))
    .catch(err => console.error("MongoDBError:", err));

const COIN_API_URL = "https://api.coingecko.com/api/v3/coins/markets";
const CURRENCY = "usd";

// Fetch cryptocurrency data with caching
const fetchCryptoData = async () => {
    try {
        const cacheKey = "cryptoData";
        const cachedData = await redis.get(cacheKey);

        if (cachedData) {
            console.log("Data from Cache");
            io.emit("cryptoData", JSON.parse(cachedData));
            return;
        }

        const { data } = await axios.get(COIN_API_URL, {
            params: { vs_currency: CURRENCY, order: "market_cap_desc", per_page: 50, page: 1 }
        });

        if (!data || data.length === 0) return;

        await Coin.deleteMany({});
        await Coin.insertMany(data.map(coin => ({
            id: coin.id,
            name: coin.name,
            symbol: coin.symbol,
            image: coin.image,
            current_price: coin.current_price,
            price_change_percentage_1h_in_currency: coin.price_change_percentage_1h_in_currency,
            price_change_percentage_24h_in_currency: coin.price_change_percentage_24h_in_currency,
            last_updated: new Date()
        })));

        await redis.set(cacheKey, JSON.stringify(data), "EX", 10);
        console.log("Data Cached!");

        io.emit("cryptoData", data);
    } catch (error) {
        console.error("Erro:", error);
    }
};

// Fetch every 10 seconds
setInterval(fetchCryptoData, 10000);

io.on("connection", (socket) => {
    console.log("Connected");

    socket.on("search", async (query) => {
        await SearchHistory.create({ searchQuery: query });
        console.log(" Search:", query);
    });

    socket.on("disconnect", () => {
        console.log(" Disconnected");
    });
});

// REST API to get saved crypto data (with caching)
app.get("/api/crypto", async (req, res) => {
    try {
        const cacheKey = "cryptoData";
        const cachedData = await redis.get(cacheKey);

        if (cachedData) {
            return res.json(JSON.parse(cachedData));
        }

        const coins = await Coin.find();
        await redis.set(cacheKey, JSON.stringify(coins), "EX", 10);
        res.json(coins);
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// REST API to get search history (with caching)
app.get("/api/search-history", async (req, res) => {
    try {
        const cacheKey = "searchHistory";
        const cachedHistory = await redis.get(cacheKey);

        if (cachedHistory) {
            return res.json(JSON.parse(cachedHistory));
        }

        const history = await SearchHistory.find().sort({ timestamp: -1 }).limit(10);
        await redis.set(cacheKey, JSON.stringify(history), "EX", 60);
        res.json(history);
    } catch (error) {
        console.error("Error History:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Health Check Route
app.get("/", (req, res) => {
    res.send("Tracker API is running...");
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`running on port ${PORT}`));
