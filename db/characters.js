// db/characters.js
const db = require('../pg-client');

async function getById(id) {
  const { rows } = await db.query(
    'SELECT data FROM characters WHERE id = $1',
    [id]
  );
  return rows[0]?.data || null;
}

async function update(id, data) {
  await db.query(
    'UPDATE characters SET data = $2 WHERE id = $1',
    [id, data]
  );
}

module.exports = { getById, update };
