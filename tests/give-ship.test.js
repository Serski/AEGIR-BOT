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
  const shopData = {
    Longboat: { infoOptions: { Category: 'Ships', 'Transferrable (Y/N)': 'Yes' } }
  };

  const dbmStub = {
    loadCollection: async (col) => {
      if (col === 'shop') return shopData;
      return { giver, receiver };
    },
    saveFile: async (col, id, data) => {
      if (id === 'giver') giver = data;
      if (id === 'receiver') receiver = data;
    }
  };

  const shopStub = { findItemName: async (name) => name };

  const charModule = await mockImport(charPath, {
    './database-manager': dbmStub,
    './shop': shopStub,
    './logger': { debug() {}, info() {}, error() {} },
    './clientManager': {},
    './pg-client': {}
  });

  let added = 0;
  charModule.addShip = (data, name) => {
    added++;
    if (!data.ships) data.ships = {};
    data.ships[name] = {};
  };
  charModule.findPlayerData = async (id) => {
    if (id === 'giver') return ['giver', giver];
    if (id === 'receiver') return ['receiver', receiver];
    return [false, false];
  };

  const res = await charModule.giveItemToPlayer('giver', 'receiver', 'Longboat', 1);
  assert.equal(res, true);
  assert.equal(added, 1);
  assert.ok(receiver.ships['Longboat']);
  assert.strictEqual(receiver.inventory['Longboat'], undefined);
  assert.strictEqual(giver.inventory['Longboat'], undefined);
});
