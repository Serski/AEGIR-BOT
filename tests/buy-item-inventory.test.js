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

test('buyItem stores stacks in inventory_items via transaction', async () => {
  let balance = 100;
  let charData = { numericID: 'usernum' };

  let saveCalled = false;
  const dbmStub = {
    loadFile: async () => charData,
    getBalance: async () => balance,
    saveFile: async () => { saveCalled = true; }
  };

  const executed = [];
  const dbStub = {
    query: async (text) => {
      if (/resolve_item_id/i.test(text)) {
        return { rows: [{ canon_id: 'Apple' }] };
      }
      if (/FROM\s+shop/i.test(text)) {
        return { rows: [{ item_id: 'Apple', price: '10', data: {} }] };
      }
      if (/FROM\s+items/i.test(text)) {
        return { rows: [{ category: 'Food' }] };
      }
      return { rows: [] };
    },
    tx: async (cb) => {
      const t = {
        query: async (text, params) => {
          executed.push(text);
          return { rows: [] };
        }
      };
      return cb(t);
    }
  };

  const shopModule = await mockImport(shopPath, {
    './database-manager': dbmStub,
    './pg-client': dbStub,
    './clientManager': { getUser: async () => ({ roles: { cache: { some: () => false }, add: () => {} } }) },
    './logger': { debug() {}, info() {}, error() {} },
    './char': { addShip: () => {} }
  });

  const reply = await shopModule.buyItem('Apple', 'Player#0001', 2, 'channel');
  assert.equal(reply, 'Succesfully bought 2 Apple');
  assert.ok(!executed.some(q => /INSERT INTO inventories/i.test(q)));
  assert.ok(executed.some(q => /INSERT INTO inventory_items/i.test(q)));
  assert.ok(!saveCalled);
  assert.strictEqual(charData.inventory, undefined);
});

