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
    "CREATE TABLE marketplace (id TEXT PRIMARY KEY, name TEXT, item_code TEXT, price INTEGER, seller TEXT, quantity INTEGER)"
  );
  pool.query("CREATE VIEW marketplace_v AS SELECT name, item_code, price, 'Weapons'::text AS category FROM marketplace");
  pool.query("CREATE TABLE inventory_items (instance_id TEXT PRIMARY KEY, owner_id TEXT, item_id TEXT, durability INTEGER, metadata JSONB)");
  for (let i = 1; i <= 5; i++) {
    pool.query(
      "INSERT INTO inventory_items (instance_id, owner_id, item_id, durability, metadata) VALUES ($1,$2,$3,NULL,'{}'::jsonb)",
      [`id${i}`, 'user1', 'sword']
    );
  }
  stubModule('pg-client.js', { pool, query: (text, params) => pool.query(text, params) });

  const inventory = { async give() {} };
  stubModule('db/inventory.js', inventory);

  const items = {
    async resolveItemCode(raw) { return raw; },
    async getItemMetaByCode(code) { return { name: 'Sword', category: 'Weapons' }; },
  };
  stubModule('db/items.js', items);
})();

const { postSale, listSales } = require(marketplacePath);

after(() => {
  for (const p of stubbed) delete require.cache[p];
  if (pool) pool.end();
});

test('postSale and listSales', async () => {
  let res = await postSale({ userId: 'user1', rawItem: 'sword', price: 10, quantity: 2 });
  assert.equal(res.ok, true);
  assert.equal(res.itemCode, 'sword');
  assert.equal(res.price, 10);
  assert.equal(res.quantity, 2);
  assert.equal(typeof res.saleId, 'string');

  res = await postSale({ userId: 'user1', rawItem: 'sword', price: 10, quantity: 5 });
  assert.deepEqual(res, { ok: false, reason: 'not_enough', owned: 3, needed: 5 });

  const realConnect = pool.connect.bind(pool);
  pool.connect = async () => {
    const client = await realConnect();
    const realQuery = client.query.bind(client);
    let first = true;
    client.query = async (text, params) => {
      if (first && typeof text === 'string' && text.startsWith('DELETE FROM inventory_items')) {
        first = false;
        const res = await realQuery(text, params);
        return { ...res, rowCount: res.rowCount - 1 };
      }
      return realQuery(text, params);
    };
    return client;
  };
  res = await postSale({ userId: 'user1', rawItem: 'sword', price: 10, quantity: 3 });
  assert.deepEqual(res, { ok: false, reason: 'concurrent_change' });
  pool.connect = realConnect;

  const sales = await listSales();
  assert.deepEqual(sales, [
    { name: 'Sword', item_code: 'sword', price: 10, category: 'Weapons' },
  ]);
});
