async function insertCharacters(client, chars) {
  const ids = [];
  for (const { id, data } of chars) {
    await client.query('INSERT INTO characters (id, data) VALUES ($1, $2)', [id, data]);
    ids.push(id);
  }
  return ids;
}

async function cleanupCharacters(client, ids) {
  if (!ids.length) return;
  await client.query('DELETE FROM characters WHERE id = ANY($1::text[])', [ids]);
}

module.exports = { insertCharacters, cleanupCharacters };
