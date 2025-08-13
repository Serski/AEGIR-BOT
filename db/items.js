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
    `SELECT id AS item_code, data->>'name' AS name, data->>'category' AS category
     FROM items WHERE id = $1`, [itemCode]
  );
  return rows[0] || null;
}

module.exports = { resolveItemCode, getItemMetaByCode };
