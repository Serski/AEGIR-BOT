// db/shop.js
const { pool } = require('../pg-client');

async function listShopItems() {
  const sql = `
    SELECT data->>'item' AS name,
           data->>'item_id' AS item_id,
           (data->>'price')::numeric AS price,
           data->'infoOptions'->>'Category' AS category
      FROM shop
     ORDER BY name
  `;
  const { rows } = await pool.query(sql);
  return rows;
}

async function getShopItemByNameOrId(nameOrId) {
  const sql = `
    SELECT data->>'item' AS name,
           data->>'item_id' AS item_id,
           (data->>'price')::numeric AS price,
           data->'infoOptions'->>'Category' AS category
      FROM shop
     WHERE LOWER(data->>'item') = LOWER($1)
        OR LOWER(data->>'item_id') = LOWER($1)
     LIMIT 1
  `;
  const { rows } = await pool.query(sql, [nameOrId]);
  return rows[0] || null;
}

module.exports = { listShopItems, getShopItemByNameOrId };
