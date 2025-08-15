const db = require('../pg-client');

async function insert(roleId) {
  await db.query(
    'INSERT INTO player_kingdoms (role_id) VALUES ($1) ON CONFLICT (role_id) DO NOTHING',
    [roleId]
  );
}

async function list() {
  const { rows } = await db.query('SELECT role_id FROM player_kingdoms ORDER BY role_id');
  return rows.map(r => r.role_id);
}

async function fetch(roleId) {
  const { rows } = await db.query('SELECT role_id FROM player_kingdoms WHERE role_id = $1', [roleId]);
  return rows[0] ? rows[0].role_id : undefined;
}

module.exports = { insert, list, fetch };
