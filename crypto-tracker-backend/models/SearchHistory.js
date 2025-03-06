const mongoose = require("mongoose");

const SearchHistorySchema = new mongoose.Schema({
    searchQuery: String,
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("SearchHistory", SearchHistorySchema);
