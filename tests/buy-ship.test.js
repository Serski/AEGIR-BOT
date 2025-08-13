const { test } = require('node:test');
const Module = require('module');
const assert = require('node:assert/strict');
const path = require('node:path');

// Simple mock import utility since node:test mocking can be flaky across files
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

test.skip('buying a ship stores it separately from inventory', async () => {
  let balance = 100;
  let charData = { numericID: 'usernum', inventory: {}, ships: {} };

  const row = {
    id: 'Longboat',
    item: 'longboat',
    price: 10,
    data: { item_id: 'longboat', name: 'Longboat', price: 10, category: 'Ships' }
  };

  const dbStub = {
    query: async (text, params) => {
      if (/FROM shop/i.test(text)) {
        return { rows: [row] };
      }
      if (/resolve_item_id/i.test(text)) {
        return { rows: [{ canon_id: row.data.item_id }] };
      }
      if (/FROM items/i.test(text)) {
        return { rows: [{ category: 'Ships' }] };
      }
      return { rows: [] };
    },
    tx: async cb => cb({
      query: async (text, params) => {
        if (/INSERT INTO balances/i.test(text)) {
          balance = params[1];
        }
        return { rows: [] };
      }
    })
  };

  const dbmStub = {
    loadFile: async () => charData,
    saveFile: async (col, id, data) => { charData = data; },
    getBalance: async () => balance
  };

  const shopModule = await mockImport(shopPath, {
    './database-manager': dbmStub,
    './pg-client': dbStub,
    './clientManager': { getUser: async () => ({ roles: { cache: { some: () => false }, add: () => {} } }) },
    './logger': { debug() {}, info() {}, error() {} },
    './char': { addShip: (data, name) => { if (!data.ships) data.ships = {}; data.ships[name] = {}; } }
  });

  const reply = await shopModule.buyItem('Longboat', 'Player#0001', 1, 'channel');
  assert.equal(reply, 'Succesfully bought 1 longboat');
  assert.equal(balance, 90);
  assert.ok(charData.ships['longboat']);
  assert.strictEqual(charData.inventory['longboat'], undefined);
});

test.skip('buying ship items with varied category casing routes to ships list', async (t) => {
  for (const category of ['Ship', 'ships']) {
    await t.test(category, async () => {
      let balance = 100;
      let charData = { numericID: 'usernum', inventory: {}, ships: {} };
      const row = {
        id: 'Longboat',
        item: 'longboat',
        price: 10,
        data: { item_id: 'longboat', name: 'Longboat', price: 10, category }
      };
      const dbStub = {
        query: async (text, params) => {
          if (/FROM shop/i.test(text)) return { rows: [row] };
          if (/resolve_item_id/i.test(text)) return { rows: [{ canon_id: row.data.item_id }] };
          if (/FROM items/i.test(text)) return { rows: [{ category }] };
          return { rows: [] };
        },
        tx: async cb => cb({
          query: async (text, params) => {
            if (/INSERT INTO balances/i.test(text)) balance = params[1];
            return { rows: [] };
          }
        })
      };
      const dbmStub = {
        loadFile: async () => charData,
        saveFile: async (col, id, data) => { charData = data; },
        getBalance: async () => balance
      };
      const shopModule = await mockImport(shopPath, {
        './database-manager': dbmStub,
        './pg-client': dbStub,
        './clientManager': { getUser: async () => ({ roles: { cache: { some: () => false }, add: () => {} } }) },
        './logger': { debug() {}, info() {}, error() {} },
        './char': { addShip: (data, name) => { if (!data.ships) data.ships = {}; data.ships[name] = {}; } }
      });

      const reply = await shopModule.buyItem('Longboat', 'Player#0001', 1, 'channel');
      assert.equal(reply, 'Succesfully bought 1 longboat');
      assert.equal(balance, 90);
      assert.ok(charData.ships['longboat']);
      assert.strictEqual(charData.inventory['longboat'], undefined);
    });
  }
});

