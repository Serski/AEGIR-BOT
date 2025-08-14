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

async function ensure(user) {
  const charId = user.id;
  await db.query(
    `INSERT INTO characters (id, data)
     VALUES ($1, $2)
     ON CONFLICT (id) DO NOTHING`,
    [
      charId,
      JSON.stringify({
        name: user.username,
        created_at: new Date().toISOString(),
      }),
    ]
  );
  return charId;
}

module.exports = { getById, update, ensure };
