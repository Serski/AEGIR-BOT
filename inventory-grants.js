
async function ensureItem(client, raw, category = 'Misc') {
  const { rows } = await client.query('SELECT resolve_item_id($1) AS canon_id', [raw]);
  const canonId = rows[0].canon_id;
  await client.query(
    `INSERT INTO items (id, category, data)
         SELECT $1, $2, '{}'::jsonb
          WHERE NOT EXISTS (SELECT 1 FROM items WHERE id = $1)`,
    [canonId, category]
  );
  return canonId;
}

const { randomUUID } = require('crypto');

async function grantItemToPlayer(client, characterId, itemId, qty) {
  if (qty <= 0) {
    throw new Error('qty must be positive');
  }
  try {
    await client.query(
      `INSERT INTO inventory_items (instance_id, owner_id, item_id)
         SELECT md5(random()::text), $1, $2
           FROM generate_series(1, $3::int)`,
      [characterId, itemId, qty]
    );
  } catch (err) {
    if (err.message && err.message.includes('generate_series')) {
      for (let i = 0; i < qty; i++) {
        await client.query(
          `INSERT INTO inventory_items (instance_id, owner_id, item_id)
             VALUES ($1, $2, $3)`,
          [randomUUID(), characterId, itemId]
        );
      }
    } else {
      throw err;
    }
  }
  return itemId;
}

module.exports = {
  ensureItem,
  grantItemToPlayer,
};
