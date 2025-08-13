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
  const pgMem = mem.adapters.createPg();
  pool = new pgMem.Pool();
  pool.query("CREATE TABLE marketplace (name TEXT, item_code TEXT, price INTEGER, seller TEXT, quantity INTEGER)");
  pool.query("CREATE VIEW marketplace_v AS SELECT name, item_code, price, 'Weapons'::text AS category FROM marketplace");
  stubModule('pg-client.js', { pool, query: (text, params) => pool.query(text, params) });

  const inventory = {
    counts: { user1: { sword: 5 } },
    async getCount(userId, itemCode) { return this.counts[userId]?.[itemCode] ?? 0; },
    async take(userId, itemCode, qty) {
      const have = await this.getCount(userId, itemCode);
      if (have < qty) return 0;
      this.counts[userId][itemCode] -= qty;
      return qty;
    },
  };
  stubModule('db/inventory.js', inventory);

  const items = {
    async resolveItemCode(raw) { return raw; },
    async getItemMetaByCode(code) { return { name: 'Sword', category: 'Weapons' }; },
  };
  stubModule('db/items.js', items);
})();

const marketplace = require(marketplacePath);

after(() => {
  for (const p of stubbed) delete require.cache[p];
  if (pool) pool.end();
});

test('postSale and listSales', async () => {
  let res = await marketplace.postSale({ userId: 'user1', rawItem: 'sword', price: 10, quantity: 2 });
  assert.deepEqual(res, { ok: true, itemCode: 'sword', price: 10, quantity: 2 });

  res = await marketplace.postSale({ userId: 'user1', rawItem: 'sword', price: 10, quantity: 5 });
  assert.deepEqual(res, { ok: false, reason: 'not_enough', owned: 3, needed: 5 });

  const inventory = require(path.join(rootDir, 'db/inventory.js'));
  inventory.take = async (userId, itemCode, qty) => qty - 1;
  res = await marketplace.postSale({ userId: 'user1', rawItem: 'sword', price: 10, quantity: 3 });
  assert.deepEqual(res, { ok: false, reason: 'concurrent_change' });

  const sales = await marketplace.listSales();
  assert.deepEqual(sales, [
    { name: 'Sword', item_code: 'sword', price: 10, category: 'Weapons' },
  ]);
});
