const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');
const path = require('node:path');

// helper to mock imports similar to other tests
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
    const resolved = Module._resolveFilename(request, parent, isMain);
    if (Object.prototype.hasOwnProperty.call(resolvedMocks, resolved)) {
      return resolvedMocks[resolved];
    }
    return originalLoad(resolved, parent, isMain);
  };
  delete require.cache[resolvedPath];
  try {
    return require(resolvedPath);
  } finally {
    Module._load = originalLoad;
  }
}

const root = path.join(__dirname, '..');
const charPath = path.join(root, 'char.js');

test('transferring a ship gives it to ships collection only', async () => {
  let giver = { inventory: { Longboat: 1 }, ships: {} };
  let receiver = { inventory: {}, ships: {} };
  const giverTag = 'Giver#1111';
  const receiverTag = 'Receiver#2222';

  const updates = [];

  const dbmStub = {
    saveFile: async (col, id, data) => {
      if (id === giverTag) giver = data;
      if (id === receiverTag) receiver = data;
    },
    updateInventory: async (id, item, delta) => {
      updates.push({ id, item, delta });
      const target = id === giverTag ? giver : receiver;
      target.inventory[item] = (target.inventory[item] || 0) + delta;
      if (target.inventory[item] <= 0) delete target.inventory[item];
    },
    getItemDefinition: async () => ({
      data: { category: 'Ships', transferrable: 'Yes' }
    })
  };

  const dbStub = {
    query: async (sql, params) => {
      if (sql.includes('SELECT quantity FROM v_inventory')) {
        return { rows: [{ quantity: giver.inventory[params[1]] || 0 }] };
      }
      return { rows: [] };
    }
  };

  const invGrantsStub = {
    ensureItem: async (client, name) => name,
    grantItemToPlayer: async () => {}
  };

  const charModule = await mockImport(charPath, {
    './database-manager': dbmStub,
    './logger': { debug() {}, info() {}, error() {} },
    './clientManager': {},
    './pg-client': dbStub,
    './inventory-grants': invGrantsStub
  });

  let added = 0;
  charModule.addShip = (data, name) => {
    added++;
    if (!data.ships) data.ships = {};
    data.ships[name] = {};
  };
  charModule.findPlayerData = async (id) => {
    if (id === giverTag) return [giverTag, giver];
    if (id === receiverTag) return [receiverTag, receiver];
    return [false, false];
  };

  const res = await charModule.giveItemToPlayer(giverTag, receiverTag, 'Longboat', 1);
  assert.equal(res, true);
  assert.equal(added, 1);
  assert.ok(receiver.ships['Longboat']);
  assert.strictEqual(receiver.inventory['Longboat'], undefined);
  assert.strictEqual(giver.inventory['Longboat'], undefined);
  assert.deepEqual(updates, [
    { id: giverTag, item: 'Longboat', delta: -1 }
  ]);
});
