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

test.skip('buying a ship stores it separately from inventory', async (t) => {
  let charData = { numericID: 'usernum', balance: 100, inventory: {}, ships: {} };
  const shopData = {
    'Longboat': {
      infoOptions: { Category: 'Ships', Icon: ':ship:' },
      shopOptions: { 'Price (#)': 10, Channels: '', 'Need Role': '', 'Give Role': '' }
    }
  };
  const dbmShopStub = {
    loadCollection: async (col) => col === 'shop' ? shopData : { 'Player#0001': charData },
    loadFile: async () => charData,
    saveFile: async (col, id, data) => { charData = data; }
  };
  const shopModule = await mockImport(shopPath, {
    './database-manager': dbmShopStub,
    './pg-client': { query: async () => ({ rows: [{ id: 'Longboat' }] }) },
    './clientManager': { getUser: async () => ({ roles: { cache: { some: () => false }, add: () => {} } }) },
    './logger': { debug() {}, info() {}, error() {} },
    './char': { addShip: (data, name) => { if (!data.ships) data.ships = {}; data.ships[name] = {}; } }
  });

  const reply = await shopModule.buyItem('Longboat', 'Player#0001', 1, 'channel');
  assert.equal(reply, 'Succesfully bought 1 Longboat');
  assert.equal(charData.balance, 90);
  assert.ok(charData.ships['Longboat']);
  assert.strictEqual(charData.inventory['Longboat'], undefined);

});

test.skip('buying ship items with varied category casing routes to ships list', async (t) => {
  for (const category of ['Ship', 'ships']) {
    await t.test(category, async () => {
      let charData = { numericID: 'usernum', balance: 100, inventory: {}, ships: {} };
      const shopData = {
        'Longboat': {
          infoOptions: { Category: category, Icon: ':ship:' },
          shopOptions: { 'Price (#)': 10, Channels: '', 'Need Role': '', 'Give Role': '' }
        }
      };
      const dbmShopStub = {
        loadCollection: async (col) => col === 'shop' ? shopData : { 'Player#0001': charData },
        loadFile: async () => charData,
        saveFile: async (col, id, data) => { charData = data; }
      };
      const shopModule = await mockImport(shopPath, {
        './database-manager': dbmShopStub,
        './pg-client': { query: async () => ({ rows: [{ id: 'Longboat' }] }) },
        './clientManager': { getUser: async () => ({ roles: { cache: { some: () => false }, add: () => {} } }) },
        './logger': { debug() {}, info() {}, error() {} },
        './char': { addShip: (data, name) => { if (!data.ships) data.ships = {}; data.ships[name] = {}; } }
      });

      const reply = await shopModule.buyItem('Longboat', 'Player#0001', 1, 'channel');
      assert.equal(reply, 'Succesfully bought 1 Longboat');
      assert.equal(charData.balance, 90);
      assert.ok(charData.ships['Longboat']);
      assert.strictEqual(charData.inventory['Longboat'], undefined);
    });
  }
});
