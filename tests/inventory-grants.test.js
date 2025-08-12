const { test } = require('node:test');
const assert = require('node:assert/strict');
const { newDb, DataType } = require('pg-mem');

const { resolveItemId } = require('../inventory-grants');

function setup() {
  const db = newDb();
  db.public.registerFunction({
    name: 'generate_series',
    args: [DataType.integer, DataType.integer],
    returns: DataType.integer,
    implementation: function* (start, end) {
      for (let i = start; i <= end; i++) {
        yield i;
      }
    },
    impure: true,
  });
  db.public.registerFunction({
    name: 'random',
    args: [],
    returns: DataType.float,
    implementation: Math.random,
    impure: true,
  });
  const crypto = require('crypto');
  db.public.registerFunction({
    name: 'md5',
    args: [DataType.text],
    returns: DataType.text,
    implementation: (str) => crypto.createHash('md5').update(str).digest('hex'),
    impure: false,
  });
  const pgMem = db.adapters.createPg();
  const pool = new pgMem.Pool();
  return { pool };
}

test('resolveItemId matches by id and case-insensitive name', async () => {
  const { pool } = setup();

  await pool.query('CREATE TABLE items (id TEXT PRIMARY KEY, data JSONB)');
  await pool.query('CREATE TABLE inventory_items (instance_id TEXT PRIMARY KEY, owner_id TEXT, item_id TEXT)');
  await pool.query("INSERT INTO items (id, data) VALUES ($1, $2)", ['wood_sword', { infoOptions: { Name: 'Wood Sword' } }]);

  const client = { query: (text, params) => pool.query(text, params) };

  const byId = await resolveItemId(client, 'wood_sword');
  assert.equal(byId, 'wood_sword');

  const byName = await resolveItemId(client, 'Wood Sword');
  assert.equal(byName, 'wood_sword');
});

