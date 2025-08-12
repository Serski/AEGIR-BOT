async function resolveItemId(client, key) {
  const { rows } = await client.query(
    `SELECT id FROM items
       WHERE LOWER(id) = LOWER($1)
          OR LOWER(data->>'name') = LOWER($1)
          OR LOWER(data->>'Name') = LOWER($1)
          OR LOWER(data->'infoOptions'->>'Name') = LOWER($1)
       LIMIT 1`,
    [key]
  );
  if (!rows[0]) {
    throw new Error('Item not found');
  }
  return rows[0].id;
}

const { randomUUID } = require('crypto');

async function grantItemToPlayer(client, characterId, itemKey, qty) {
  if (qty <= 0) {
    throw new Error('qty must be positive');
  }
  const itemId = await resolveItemId(client, itemKey);
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
  resolveItemId,
  grantItemToPlayer,
};
