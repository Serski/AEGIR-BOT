const db = require('../pg-client');

async function get(key) {
  const { rows } = await db.query('SELECT data FROM keys WHERE id=$1', [key]);
  return rows[0] ? rows[0].data : undefined;
}

async function set(key, data) {
  await db.query(
    `INSERT INTO keys (id, data) VALUES ($1,$2)
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
    [key, data]
  );
}

module.exports = { get, set };
