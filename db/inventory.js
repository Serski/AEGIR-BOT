// db/inventory.js
const { pool } = require('../pg-client'); // adjust to your pool import

// 1 row per unit; name or id is OK (server resolves)
async function grantItemToPlayer(playerId, itemIdOrName, qty = 1) {
  const sql = `
    INSERT INTO inventory_items (instance_id, owner_id, item_id, durability, metadata)
    SELECT gen_random_uuid()::text, $1, resolve_item_id($2), NULL, '{}'::jsonb
    FROM generate_series(1, $3)
  `;
  await pool.query(sql, [playerId, itemIdOrName, qty]);
}

async function takeItemsFromPlayer(playerId, itemIdOrName, qty = 1) {
  const sql = `
    DELETE FROM inventory_items
    WHERE ctid IN (
      SELECT ctid
      FROM inventory_items
      WHERE owner_id = $1 AND item_id = resolve_item_id($2)
      LIMIT $3
    )
  `;
  await pool.query(sql, [playerId, itemIdOrName, qty]);
}

async function getInventoryView(playerId) {
  const sql = `
    SELECT character_id, item_id, quantity, name, category
    FROM v_inventory
    WHERE character_id = $1
    ORDER BY name
  `;
  const { rows } = await pool.query(sql, [playerId]);
  return rows;
}

module.exports = {
  grantItemToPlayer,
  takeItemsFromPlayer,
  getInventoryView,
};
