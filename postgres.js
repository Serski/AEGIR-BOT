require("dotenv").config(); // ✅ Load .env variables first
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

pool.connect()
  .then(() => console.log("[db] Connected to Postgres"))
  .catch(err => {
    console.error("[db] Connection failed:", err);
    process.exit(1);
  });

module.exports = pool;
