const db = require('../pg-client');

async function get(id) {
  const { rows } = await db.query(
    "SELECT data->'editingFields' AS editingFields FROM characters WHERE id=$1",
    [id]
  );
  return rows[0] ? rows[0].editingfields : undefined;
}

async function set(id, fields) {
  await db.query(
    `INSERT INTO characters (id, data) VALUES ($1, jsonb_build_object('editingFields', $2::jsonb))
     ON CONFLICT (id) DO UPDATE SET data = jsonb_set(COALESCE(characters.data, '{}'::jsonb), '{editingFields}', $2::jsonb)`,
    [id, fields]
  );
}

module.exports = { get, set };
