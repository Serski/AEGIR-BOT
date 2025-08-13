const { test } = require('node:test');
const Module = require('module');

async function mockImport(modulePath, mocks) {
  const resolvedPath = require.resolve(modulePath);
  const originalLoad = Module._load;
  Module._load = function(request, parent, isMain) {
    if (Object.prototype.hasOwnProperty.call(mocks, request)) {
      return mocks[request];
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

const assert = require('node:assert/strict');
const path = require('node:path');

const root = path.join(__dirname, '..');
const shopPath = path.join(root, 'shop.js');

test('createShopEmbed shows only items with numeric prices', async () => {
  const rows = [
    { id: 1, name: 'Longboat', item_code: 'longboat', price: 100, category: 'Ships' },
    { id: 2, name: 'Broken Ship', item_code: 'broken_ship', price: 'abc', category: 'Ships' },
    { id: 3, name: 'Wood', item_code: 'wood', price: 5, category: 'Resources' },
    { id: 4, name: 'Stone', item_code: 'stone', price: null, category: 'Materials' }
  ];

  const dbStub = { query: async () => ({ rows }) };

  const discordStub = {
    EmbedBuilder: class {
      constructor() { this.fields = []; }
      setTitle() { return this; }
      setColor() { return this; }
      addFields(field) { this.fields.push(field); return this; }
    },
  };

  const shopModule = await mockImport(shopPath, {
    './pg-client': dbStub,
    'discord.js': discordStub,
    './database-manager': {},
    './clientManager': {},
    './dataGetters': {},
    './logger': { debug() {}, info() {}, error() {} }
  });

  const [embed] = await shopModule.createShopEmbed();
  const categories = embed.fields.map(f => f.name);
  assert.equal(categories.length, 2);
  assert.ok(categories.some(name => name.includes('Ships')));
  assert.ok(categories.some(name => name.includes('Resources')));

  const shipsField = embed.fields.find(f => f.name.includes('Ships'));
  assert.ok(shipsField.value.includes('Longboat'));
  assert.ok(!shipsField.value.includes('Broken Ship'));

  const resourcesField = embed.fields.find(f => f.name.includes('Resources'));
  assert.ok(resourcesField.value.includes('Wood'));
  assert.ok(!resourcesField.value.includes('Stone'));
});
