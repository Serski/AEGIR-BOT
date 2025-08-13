// db/marketplace.js
const { pool } = require('../pg-client');

async function listSales() {
  const sql = `
    SELECT name, item_code, price, category
    FROM marketplace_v
    ORDER BY name
  `;
  const { rows } = await pool.query(sql);
  return rows;
}

module.exports = { listSales };
