// db/inventory.js
const pool = require('../pg-client'); // your existing pool

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

// new tiny helper to count how many of an item a user owns
async function getCount(userId, itemCode) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS qty
       FROM inventory_items
      WHERE owner_id = $1 AND item_id = $2`,
    [userId, itemCode]
  );
  return rows[0]?.qty || 0;
}

// insert qty rows; caller has validated item exists
async function give(userId, itemCode, qty = 1) {
  const { rows } = await pool.query(
    `INSERT INTO inventory_items (instance_id, owner_id, item_id, durability, metadata)
     SELECT gen_random_uuid()::text, $1, $2, NULL, '{}'::jsonb
     FROM generate_series(1, $3)
     RETURNING 1`,
    [userId, itemCode, qty]
  );
  return rows.length;
}

// delete exactly qty rows using ctid pattern (safe + fast)
async function take(userId, itemCode, qty = 1) {
  const { rowCount } = await pool.query(
    `WITH victims AS (
       SELECT ctid
         FROM inventory_items
        WHERE owner_id = $1 AND item_id = $2
        LIMIT $3
     )
     DELETE FROM inventory_items ii
     USING victims v
     WHERE ii.ctid = v.ctid`,
    [userId, itemCode, qty]
  );
  return rowCount; // number removed
}

async function listView(userId) {
  const { rows } = await pool.query(
    `SELECT item_id, quantity, name, category
       FROM v_inventory
      WHERE character_id = $1
      ORDER BY name`,
    [userId]
  );
  return rows;
}

module.exports = {
  grantItemToPlayer,
  takeItemsFromPlayer,
  getInventoryView,
  getCount,
  give,
  take,
  listView,
};
