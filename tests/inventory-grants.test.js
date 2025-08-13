const { test } = require('node:test');
const assert = require('node:assert/strict');
const { newDb, DataType } = require('pg-mem');

const { ensureItem, grantItemToPlayer } = require('../inventory-grants');

function setup({ series = true } = {}) {
  const db = newDb();

  if (series) {
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
  }

  db.public.registerFunction({
    name: 'resolve_item_id',
    args: [DataType.text],
    returns: DataType.text,
    implementation: (raw) => raw.toLowerCase().replace(/\s+/g, '_'),
    impure: false,
  });

  const pgMem = db.adapters.createPg();
  const pool = new pgMem.Pool();
  return { pool };
}

test('ensureItem resolves canon id and inserts row when missing', async () => {
  const { pool } = setup();

  await pool.query('CREATE TABLE items (id TEXT PRIMARY KEY, category TEXT, data JSONB)');

  const client = { query: (text, params) => pool.query(text, params) };

  const canon = await ensureItem(client, 'Wood Sword', 'Weapons');
  assert.equal(canon, 'wood_sword');

  const { rows } = await pool.query('SELECT id, category, data FROM items');
  assert.deepEqual(rows, [{ id: 'wood_sword', category: 'Weapons', data: {} }]);

  // Calling again should not change existing row
  await ensureItem(client, 'Wood Sword', 'Misc');
  const { rows: rows2 } = await pool.query('SELECT id, category FROM items');
  assert.equal(rows2.length, 1);
  assert.equal(rows2[0].category, 'Weapons');
});

test('grantItemToPlayer ensures item and inserts instances', async () => {
  const { pool } = setup({ series: false });

  await pool.query('CREATE TABLE items (id TEXT PRIMARY KEY, category TEXT, data JSONB)');
  await pool.query('CREATE TABLE inventory_items (instance_id TEXT PRIMARY KEY, owner_id TEXT, item_id TEXT)');

  const client = { query: (text, params) => pool.query(text, params) };

  const canon = await ensureItem(client, 'Wood', 'Misc');
  assert.equal(canon, 'wood');
  await grantItemToPlayer(client, 'char1', canon, 2);

  const { rows: itemRows } = await pool.query('SELECT id, category FROM items');
  assert.deepEqual(itemRows, [{ id: canon, category: 'Misc' }]);

  const { rows: invRows } = await pool.query('SELECT owner_id, item_id FROM inventory_items');
  assert.equal(invRows.length, 2);
  assert.ok(invRows.every((r) => r.owner_id === 'char1' && r.item_id === canon));
});

