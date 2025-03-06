require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const http = require("http");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const Coin = require("./models/Coin");
const SearchHistory = require("./models/SearchHistory");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

// Connect MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log(err));

const COIN_API_URL = "https://api.coingecko.com/api/v3/coins/markets?vs_currency";
const CURRENCY = "usd";
const fetchCryptoData = async () => {
    try {
        const { data } = await axios.get(COIN_API_URL, {
            params: { vs_currency: "usd", order: "market_cap_desc", per_page: 50, page: 1 }
        });

        if (!data || data.length === 0) {
           // console.log("No data.");
            return;
        }

       // console.log("data from API:", data.length, "coins");

        await Coin.deleteMany({}); // Clear old data
        console.log("cleared.");

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

       // console.log("inserted into MongoDB.");
        io.emit("cryptoData", data);
    } catch (error) {
       // console.error(" Error fetchCryptoData:", error);
    }
};


// Fetch data every 10 seconds
setInterval(fetchCryptoData, 10000);
io.on("connection", (socket) => {
    console.log("connected");

    socket.on("search", async (query) => {
      //  await SearchHistory.deleteMany({}); // Clear old data
        await SearchHistory.create({ searchQuery: query });
       // console.log("Search query saved:", query);
    });

    socket.on("disconnect", () => {
       // console.log("disconnected");
    });
});

// REST API to get saved coin data
app.get("/api/crypto", async (req, res) => {
    const coins = await Coin.find();
    res.json(coins);
});

// REST API to get search history
app.get("/api/search-history", async (req, res) => {
    const history = await SearchHistory.find().sort({ timestamp: -1 }).limit(10);
    res.json(history);
});


server.listen(5000, () => console.log("Server running on port 5000"));
