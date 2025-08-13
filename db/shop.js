// db/shop.js
const { pool } = require('../pg-client');

async function listShopItems() {
  const sql = `
    SELECT id, name, item_code, price, category
    FROM shop_v
    ORDER BY name
  `;
  const { rows } = await pool.query(sql);
  return rows;
}

async function getShopItemByNameOrId(nameOrId) {
  const sql = `
    SELECT id, name, item_code, price, category
    FROM shop_v
    WHERE LOWER(name) = LOWER($1) OR id::text = $1
    LIMIT 1
  `;
  const { rows } = await pool.query(sql, [nameOrId]);
  return rows[0] || null;
}

module.exports = { listShopItems, getShopItemByNameOrId };
