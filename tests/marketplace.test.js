const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const marketplacePath = path.join(rootDir, 'marketplace.js');

let pool;
const stubbed = new Set();

function stubModule(file, exports) {
  const filePath = path.join(rootDir, file);
  require.cache[filePath] = { id: filePath, filename: filePath, loaded: true, exports };
  stubbed.add(filePath);
}

(function setup() {
  const { newDb } = require('pg-mem');
  const mem = newDb();
  const { randomUUID } = require('crypto');
  mem.public.registerFunction({
    name: 'gen_random_uuid',
    returns: 'text',
    implementation: () => randomUUID(),
  });
  const pgMem = mem.adapters.createPg();
  pool = new pgMem.Pool();
  pool.query(
    'CREATE TABLE marketplace (id TEXT PRIMARY KEY, name TEXT, item_id TEXT, price INTEGER, seller TEXT, quantity INTEGER)'
  );
  pool.query(
    "CREATE VIEW marketplace_v AS SELECT id, name, item_id, price, seller, quantity FROM marketplace"
  );
  stubModule('pg-client.js', { pool, query: (text, params) => pool.query(text, params) });

  // inventory mocks will be customized per test
  let getCountMock = async () => 0;
  let takeMock = async () => 0;
  const inventory = {
    async getCount(userId, itemCode) { return getCountMock(userId, itemCode); },
    async take(userId, itemCode, qty) { return takeMock(userId, itemCode, qty); },
    async give() {},
    // expose helpers to modify behaviour in tests
    _setGetCount(fn) { getCountMock = fn; },
    _setTake(fn) { takeMock = fn; },
  };
  stubModule('db/inventory.js', inventory);

  const items = {
    async resolveItemCode(raw) { return raw; },
    async getItemMetaByCode(code) { return { name: 'Sword', category: 'Weapons' }; },
  };
  stubModule('db/items.js', items);
})();

const { postSale } = require(marketplacePath);
const inventory = require('../db/inventory');

after(() => {
  for (const p of stubbed) delete require.cache[p];
  if (pool) pool.end();
});

test('postSale handles inventory operations correctly', async () => {
  // success path
  inventory._setGetCount(async () => 5);
  inventory._setTake(async (_u, _i, qty) => qty);
  let res = await postSale({ userId: 'user1', itemCode: 'sword', price: 10, quantity: 2 });
  assert.equal(res.ok, true);
  assert.equal(res.itemCode, 'sword');
  assert.equal(res.price, 10);
  assert.equal(res.quantity, 2);
  assert.equal(typeof res.saleId, 'string');
  let { rows } = await pool.query('SELECT * FROM marketplace');
  assert.equal(rows.length, 1);

  // not enough items
  inventory._setGetCount(async () => 1);
  inventory._setTake(async () => { throw new Error('should not be called'); });
  res = await postSale({ userId: 'user1', itemCode: 'sword', price: 10, quantity: 5 });
  assert.deepEqual(res, { ok: false, reason: 'not_enough', owned: 1, needed: 5 });
  ;({ rows } = await pool.query('SELECT * FROM marketplace'));
  assert.equal(rows.length, 1); // no new row

  // concurrent change during take
  inventory._setGetCount(async () => 5);
  inventory._setTake(async (_u, _i, qty) => qty - 1);
  res = await postSale({ userId: 'user1', itemCode: 'sword', price: 10, quantity: 3 });
  assert.deepEqual(res, { ok: false, reason: 'concurrent_change' });
  ;({ rows } = await pool.query('SELECT * FROM marketplace'));
  assert.equal(rows.length, 1); // still only the first successful sale
});
