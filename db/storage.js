// db/storage.js
const pool = require('../pg-client');

async function store(ownerId, itemId, qty = 1) {
  await pool.query(
    `INSERT INTO storage_items (owner_id, item_id, quantity)
     VALUES ($1, $2, $3)
     ON CONFLICT (owner_id, item_id)
     DO UPDATE SET quantity = storage_items.quantity + EXCLUDED.quantity`,
    [ownerId, itemId, qty]
  );
}

async function retrieve(ownerId, itemId, qty = 1) {
  const { rowCount } = await pool.query(
    `UPDATE storage_items
        SET quantity = quantity - $3
      WHERE owner_id = $1 AND item_id = $2 AND quantity >= $3`,
    [ownerId, itemId, qty]
  );
  if (!rowCount) return 0;
  await pool.query(
    `DELETE FROM storage_items WHERE owner_id = $1 AND item_id = $2 AND quantity <= 0`,
    [ownerId, itemId]
  );
  return rowCount;
}

async function get(ownerId, itemId) {
  const { rows } = await pool.query(
    `SELECT quantity FROM storage_items WHERE owner_id = $1 AND item_id = $2`,
    [ownerId, itemId]
  );
  return rows[0]?.quantity || 0;
}

module.exports = {
  store,
  retrieve,
  get,
};
