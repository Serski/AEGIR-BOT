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

async function grantItemToPlayer(client, characterId, itemKey, qty) {
  if (qty <= 0) {
    throw new Error('qty must be positive');
  }
  const itemId = await resolveItemId(client, itemKey);
  await client.query(
    `INSERT INTO inventory_items (instance_id, owner_id, item_id)
       SELECT md5(random()::text), $1, $2
         FROM generate_series(1, $3::int)`,
    [characterId, itemId, qty]
  );
  return itemId;
}

module.exports = {
  resolveItemId,
  grantItemToPlayer,
};
