// db/items.js
const pool = require('../pg-client'); // your existing pool

async function resolveItemCode(raw) {
  // use DB resolver so both ids and display names work
  const { rows } = await pool.query(
    `SELECT resolve_item_id($1) AS item_code`, [raw]
  );
  return rows[0]?.item_code || raw;
}

async function getItemMetaByCode(itemCode) {
  const { rows } = await pool.query(
    `SELECT id AS item_code, data->>'name' AS name, data->>'category' AS category
     FROM items WHERE id = $1`, [itemCode]
  );
  return rows[0] || null;
}

module.exports = { resolveItemCode, getItemMetaByCode };
