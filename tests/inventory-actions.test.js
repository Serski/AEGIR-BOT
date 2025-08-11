const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const root = path.join(__dirname, '..');
const charPath = path.join(root, 'char.js');

function mockModule(modulePath, mock) {
  const resolved = require.resolve(modulePath);
  require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports: mock };
}

test('char.addItem uses user tag when updating inventory', async (t) => {
  let updateCall;
  mockModule(path.join(root, 'database-manager.js'), {
    getItemDefinition: async () => ({}),
    updateInventory: async (id, item, delta) => { updateCall = { id, item, delta }; }
  });
  mockModule(path.join(root, 'shop.js'), {});
  mockModule(path.join(root, 'clientManager.js'), {});
  mockModule(path.join(root, 'logger.js'), { debug() {}, info() {}, error() {} });
  mockModule(path.join(root, 'pg-client.js'), { query: async () => ({ rows: [] }) });
  mockModule('discord.js', { ActionRowBuilder: class {}, ButtonBuilder: class {}, ButtonStyle: {}, EmbedBuilder: class {}, createWebhook: () => {} });

  const charModule = require(charPath);
  await charModule.addItem('TestUser#0001', 'Potion', { qty: 2 });
  assert.deepEqual(updateCall, { id: 'TestUser#0001', item: 'Potion', delta: 2 });

  t.after(() => {
    delete require.cache[require.resolve(path.join(root, 'database-manager.js'))];
    delete require.cache[require.resolve(path.join(root, 'shop.js'))];
    delete require.cache[require.resolve(path.join(root, 'clientManager.js'))];
    delete require.cache[require.resolve(path.join(root, 'logger.js'))];
    delete require.cache[require.resolve(path.join(root, 'pg-client.js'))];
    delete require.cache[require.resolve('discord.js')];
    delete require.cache[charPath];
  });
});

test('char.removeItem uses user tag when updating inventory', async (t) => {
  let updateCall;
  mockModule(path.join(root, 'database-manager.js'), {
    getItemDefinition: async () => ({}),
    updateInventory: async (id, item, delta) => { updateCall = { id, item, delta }; }
  });
  mockModule(path.join(root, 'shop.js'), {});
  mockModule(path.join(root, 'clientManager.js'), {});
  mockModule(path.join(root, 'logger.js'), { debug() {}, info() {}, error() {} });
  mockModule(path.join(root, 'pg-client.js'), { query: async () => ({ rows: [] }) });
  mockModule('discord.js', { ActionRowBuilder: class {}, ButtonBuilder: class {}, ButtonStyle: {}, EmbedBuilder: class {}, createWebhook: () => {} });
  delete require.cache[charPath];
  const charModule = require(charPath);
  await charModule.removeItem('TestUser#0001', 'Potion', { qty: 1 });
  assert.deepEqual(updateCall, { id: 'TestUser#0001', item: 'Potion', delta: -1 });

  t.after(() => {
    delete require.cache[require.resolve(path.join(root, 'database-manager.js'))];
    delete require.cache[require.resolve(path.join(root, 'shop.js'))];
    delete require.cache[require.resolve(path.join(root, 'clientManager.js'))];
    delete require.cache[require.resolve(path.join(root, 'logger.js'))];
    delete require.cache[require.resolve(path.join(root, 'pg-client.js'))];
    delete require.cache[require.resolve('discord.js')];
    delete require.cache[charPath];
  });
});

