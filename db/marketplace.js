// db/marketplace.js
const { pool } = require('../pg-client');

async function listSales() {
  const { rows } = await pool.query(
    'SELECT id, name, item_code, price, category FROM marketplace_v ORDER BY name'
  );
  return rows;
}

module.exports = { listSales };
