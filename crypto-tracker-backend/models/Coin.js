const mongoose = require("mongoose");

const CoinSchema = new mongoose.Schema({
    id: String,
    name: String,
    symbol: String,
    image: String,
    current_price: Number,
    price_change_percentage_1h_in_currency: Number,
    price_change_percentage_24h_in_currency: Number,
    last_updated: Date
});

module.exports = mongoose.model("Coin", CoinSchema);
