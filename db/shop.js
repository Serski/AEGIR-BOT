// db/shop.js
const { pool } = require('../pg-client');

async function listShopItems() {
  const sql = `
    SELECT id, COALESCE(NULLIF(data->>'name',''), id) AS name,
           NULLIF(data->>'item_id','')               AS item_id,
           NULLIF(data->>'price','')::int            AS price
    FROM shop
    ORDER BY name
  `;
  const { rows } = await pool.query(sql);
  return rows;
}

async function getShopItemByNameOrId(nameOrId) {
  const sql = `
    SELECT id, COALESCE(NULLIF(data->>'name',''), id) AS name,
           resolve_item_id(COALESCE(data->>'item_id', data->>'item', data->>'name')) AS item_id,
           NULLIF(data->>'price','')::int AS price
    FROM shop
    WHERE lower(id) = lower($1) OR lower(data->>'name') = lower($1)
    LIMIT 1
  `;
  const { rows } = await pool.query(sql, [nameOrId]);
  return rows[0] || null;
}

module.exports = { listShopItems, getShopItemByNameOrId };
