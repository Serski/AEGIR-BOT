const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const dbmPath = path.join(rootDir, 'database-manager.js');
const pgClientPath = path.join(rootDir, 'pg-client.js');
const loggerPath = path.join(rootDir, 'logger.js');
let pool;

// stub database and logger
(function setup() {
  const { newDb } = require('pg-mem');
  const mem = newDb();
  const pgMem = mem.adapters.createPg();
  pool = new pgMem.Pool();
  // pre-create tables used in tests
  pool.query('CREATE TABLE balances (id TEXT PRIMARY KEY, amount INTEGER DEFAULT 0)');
  pool.query('CREATE TABLE inventories (id SERIAL PRIMARY KEY, owner_id TEXT UNIQUE)');
  pool.query(
    'CREATE TABLE inventory_items (inventory_id INTEGER, item_id TEXT, quantity INTEGER, PRIMARY KEY (inventory_id, item_id))'
  );

  require.cache[pgClientPath] = {
    id: pgClientPath,
    filename: pgClientPath,
    loaded: true,
    exports: { query: (text, params) => pool.query(text, params), pool }
  };

  require.cache[loggerPath] = {
    id: loggerPath,
    filename: loggerPath,
    loaded: true,
    exports: { info() {}, debug() {}, error() {} }
  };
})();

const dbm = require(dbmPath);

after(() => {
  delete require.cache[dbmPath];
  delete require.cache[pgClientPath];
  delete require.cache[loggerPath];
  if (pool) pool.end();
});

test('setBalance and getBalance update values', async () => {
  assert.equal(await dbm.getBalance('User#0001'), 0);
  await dbm.setBalance('User#0001', 100);
  assert.equal(await dbm.getBalance('User#0001'), 100);
  await dbm.setBalance('User#0001', 150);
  assert.equal(await dbm.getBalance('User#0001'), 150);
});

test('updateInventory adds and removes items', async () => {
  await dbm.updateInventory('User#0001', 'Iron Sword', 2);
  await dbm.updateInventory('User#0001', 'Iron Sword', -1);
  assert.deepEqual(await dbm.getInventory('User#0001'), { 'Iron Sword': 1 });
  await dbm.updateInventory('User#0001', 'Iron Sword', -1);
  assert.deepEqual(await dbm.getInventory('User#0001'), {});
});
