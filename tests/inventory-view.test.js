const { test } = require('node:test');
const Module = require('module');
const assert = require('node:assert/strict');
const path = require('node:path');

async function mockImport(modulePath, mocks) {
  const resolvedPath = require.resolve(modulePath);
  const originalLoad = Module._load;
  const resolvedMocks = {};
  for (const [key, value] of Object.entries(mocks)) {
    try {
      const abs = require.resolve(key, { paths: [path.dirname(resolvedPath)] });
      resolvedMocks[key] = value;
      resolvedMocks[abs] = value;
      delete require.cache[abs];
    } catch {}
  }
  Module._load = function(request, parent, isMain) {
    if (Object.prototype.hasOwnProperty.call(resolvedMocks, request)) {
      return resolvedMocks[request];
    }
    return originalLoad(request, parent, isMain);
  };
  delete require.cache[resolvedPath];
  try {
    return require(resolvedPath);
  } finally {
    Module._load = originalLoad;
  }
}

const root = path.join(__dirname, '..');
const shopPath = path.join(root, 'shop.js');

async function setupTest(itemName, category) {
  const { newDb } = require('pg-mem');
  const mem = newDb();
  const pgMem = mem.adapters.createPg();
  const pool = new pgMem.Pool();

  await pool.query('CREATE TABLE balances (id TEXT PRIMARY KEY, amount INTEGER DEFAULT 0)');
  await pool.query('CREATE TABLE inventories (id SERIAL PRIMARY KEY, owner_id TEXT UNIQUE)');
  await pool.query('CREATE TABLE items (id TEXT PRIMARY KEY, category TEXT, data JSONB)');
  await pool.query('CREATE TABLE inventory_items (inventory_id INTEGER, item_id TEXT, quantity INTEGER, PRIMARY KEY (inventory_id, item_id))');
  await pool.query('CREATE TABLE shop (id TEXT PRIMARY KEY)');
  await pool.query(`CREATE VIEW v_inventory AS
    SELECT inv.owner_id AS owner_id,
           ii.item_id,
           ii.quantity AS qty,
           NULL::TEXT AS instance_id,
           NULL::INTEGER AS durability,
           NULL::JSONB AS metadata,
           it.category
      FROM inventory_items ii
      JOIN inventories inv ON ii.inventory_id = inv.id
      JOIN items it ON ii.item_id = it.id`);

  await pool.query('INSERT INTO items (id, category, data) VALUES ($1, $2, $3)', [itemName, category, {}]);
  await pool.query('INSERT INTO shop (id) VALUES ($1)', [itemName]);

  const shopData = {
    [itemName]: {
      infoOptions: { Category: category },
      shopOptions: { 'Price (#)': 10, Channels: '', 'Need Role': '', 'Give Role': '' }
    }
  };

  const dbmStub = {
    loadCollection: async (col) => (col === 'shop' ? shopData : {}),
    loadFile: async () => ({ numericID: 'usernum' }),
    getBalance: async () => 100,
    saveFile: async () => {}
  };

  const dbStub = {
    query: (text, params) => pool.query(text, params),
    tx: async (cb) => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await cb({ query: (text, params) => client.query(text, params) });
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },
    pool
  };

  const shopModule = await mockImport(shopPath, {
    './database-manager': dbmStub,
    './pg-client': dbStub,
    './clientManager': { getUser: async () => ({ roles: { cache: { some: () => false }, add: () => {} } }) },
    './logger': { debug() {}, info() {}, error() {} },
    './char': { addShip: () => {} }
  });

  return { pool, shopModule };
}

test('buying a resources item appears in v_inventory and resource filter', async () => {
  const { pool, shopModule } = await setupTest('Wood', 'Resources');

  const reply = await shopModule.buyItem('Wood', 'Player#0001', 1, 'channel');
  assert.equal(reply, 'Succesfully bought 1 Wood');

  const { rows: allRows } = await pool.query('SELECT item_id, qty, category FROM v_inventory WHERE owner_id=$1', ['Player#0001']);
  assert.deepEqual(allRows, [{ item_id: 'Wood', qty: 1, category: 'Resources' }]);

  const { rows: resourceRows } = await pool.query("SELECT item_id FROM v_inventory WHERE owner_id=$1 AND category='Resources'", ['Player#0001']);
  assert.equal(resourceRows.length, 1);
  assert.equal(resourceRows[0].item_id, 'Wood');
});

test('misc item excluded from Resources filter', async () => {
  const { pool, shopModule } = await setupTest('Rope', 'Misc');

  await shopModule.buyItem('Rope', 'Player#0001', 1, 'channel');

  const { rows: allRows } = await pool.query('SELECT item_id FROM v_inventory WHERE owner_id=$1', ['Player#0001']);
  assert.equal(allRows.length, 1);
  assert.equal(allRows[0].item_id, 'Rope');

  const { rows: resRows } = await pool.query("SELECT item_id FROM v_inventory WHERE owner_id=$1 AND category='Resources'", ['Player#0001']);
  assert.equal(resRows.length, 0);
});
