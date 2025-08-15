// db/incomes.js
const pool = require('../pg-client');

async function getAll() {
  const { rows } = await pool.query(
    `SELECT name, gold_given, item_code, item_amount, emoji, roles, delay FROM incomes`
  );
  return rows;
}

async function add(name, fields = {}) {
  const columns = ['name'];
  const params = [name];
  const placeholders = ['$1'];
  let i = 2;
  for (const [key, value] of Object.entries(fields)) {
    columns.push(key);
    params.push(value);
    placeholders.push(`$${i++}`);
  }
  const sql = `INSERT INTO incomes (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
  const { rows } = await pool.query(sql, params);
  return rows[0];
}

async function update(name, fields = {}) {
  const entries = Object.entries(fields);
  if (entries.length === 0) return null;
  const sets = [];
  const params = [];
  let i = 1;
  for (const [key, value] of entries) {
    sets.push(`${key} = $${i++}`);
    params.push(value);
  }
  params.push(name);
  const sql = `UPDATE incomes SET ${sets.join(', ')} WHERE name = $${i} RETURNING *`;
  const { rows } = await pool.query(sql, params);
  return rows[0];
}

async function remove(name) {
  await pool.query('DELETE FROM incomes WHERE name = $1', [name]);
}

module.exports = { getAll, add, update, remove };
