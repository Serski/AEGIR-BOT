// db/items.js
const pool = require('../pg-client'); // your existing pool

// Resolve an item identifier or display name to its canonical item code.
// Throws when no items match or when the name maps to multiple items to
// encourage callers to use unambiguous item codes.
async function resolveItemCode(raw) {
  const { rows } = await pool.query(
    `SELECT id FROM items WHERE id = $1 OR LOWER(data->>'name') = LOWER($1) ORDER BY id`,
    [raw]
  );

  if (rows.length === 0) {
    throw new Error(`No item matches "${raw}"`);
  }
  if (rows.length > 1) {
    throw new Error(`Multiple items match "${raw}". Use an item code.`);
  }

  return rows[0].id;
}

async function getItemMetaByCode(itemCode) {
  const { rows } = await pool.query(
    `SELECT id AS item_id,
            data->>'name' AS name,
            data->>'category' AS category,
            COALESCE(data->>'icon', data->'infoOptions'->>'Icon') AS icon
       FROM items WHERE id = $1`,
    [itemCode]
  );
  return rows[0] || null;
}

// Fetch a full item row (including JSON data) by item code or name
async function getItemByNameOrCode(term) {
  const { rows } = await pool.query(
    `SELECT id AS item_id, data
       FROM items
      WHERE id = $1 OR LOWER(data->>'name') = LOWER($1)
      LIMIT 1`,
    [term]
  );
  return rows[0] || null;
}

module.exports = { resolveItemCode, getItemMetaByCode, getItemByNameOrCode };
