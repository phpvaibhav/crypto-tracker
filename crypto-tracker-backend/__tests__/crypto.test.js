const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../server"); // Import your backend server
const Coin = require("../models/Coin"); // Import your Coin model

let mongoServer;

beforeAll(async () => {
    const { MongoMemoryServer } = require("mongodb-memory-server");
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), { useNewUrlParser: true, useUnifiedTopology: true });
});

afterAll(async () => {
    await mongoose.connection.close();
    await mongoServer.stop();
});

describe("Crypto API Tests", () => {
    test("GET /api/crypto should return crypto data", async () => {
        await Coin.create({
            id: "bitcoin",
            name: "Bitcoin",
            symbol: "BTC",
            image: "https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png?1696501400",
            current_price: 50000,
            price_change_percentage_1h_in_currency: 0.5,
            price_change_percentage_24h_in_currency: 2.0
        });

        const res = await request(app).get("/api/crypto");
        
        expect(res.statusCode).toBe(200);
        expect(res.body.length).toBeGreaterThan(0);
        expect(res.body[0]).toHaveProperty("name", "Bitcoin");
    });
});
