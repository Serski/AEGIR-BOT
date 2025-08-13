const { pool } = require('./pg-client');
const inventory = require('./db/inventory');
const items = require('./db/items');

async function postSale({ userId, rawItem, price = 0, quantity = 1 }) {
  const itemCode = await items.resolveItemCode(rawItem);

  const owned = await inventory.getCount(userId, itemCode);
  if (owned < quantity) {
    return { ok: false, reason: 'not_enough', owned, needed: quantity };
  }

  const removed = await inventory.take(userId, itemCode, quantity);
  if (removed !== quantity) {
    return { ok: false, reason: 'concurrent_change' };
  }

  const meta = await items.getItemMetaByCode(itemCode);
  const name = meta?.name || itemCode;

  await pool.query(
    'INSERT INTO marketplace (name, item_code, price, seller, quantity) VALUES ($1,$2,$3,$4,$5)',
    [name, itemCode, price, userId, quantity]
  );

  return { ok: true, itemCode, price, quantity };
}

async function listSales() {
  const { rows } = await pool.query(
    'SELECT name, item_code, price, category FROM marketplace_v ORDER BY name'
  );
  return rows;
}

module.exports = { postSale, listSales };

