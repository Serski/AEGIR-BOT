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
  const shopData = {
    'Longboat': {
      infoOptions: { Category: 'Ships', Icon: ':ship:', Name: 'Longboat', Description: 'A boat' },
      shopOptions: { 'Price (#)': 100 }
    },
    'Broken Ship': {
      infoOptions: { Category: 'Ships', Icon: ':ship:', Name: 'Broken Ship' },
      shopOptions: { 'Price (#)': 'abc' }
    },
    'Wood': {
      infoOptions: { Category: 'Resources', Icon: ':wood:', Name: 'Wood', Description: 'Some wood' },
      shopOptions: { 'Price (#)': 5 }
    },
    'Stone': {
      infoOptions: { Category: 'Materials', Icon: ':rock:', Name: 'Stone' },
      shopOptions: { 'Price (#)': '' }
    }
  };

  const dbmStub = { loadCollection: async () => shopData };

  const discordStub = {
    EmbedBuilder: class {
      constructor() { this.fields = []; }
      setTitle() { return this; }
      setColor() { return this; }
      addFields(field) { this.fields.push(field); return this; }
    },
    ActionRowBuilder: class { addComponents() { return this; } },
    ButtonBuilder: class {
      setCustomId() { return this; }
      setLabel() { return this; }
      setStyle() { return this; }
    },
    ButtonStyle: { Primary: 1 }
  };

  const shopModule = await mockImport(shopPath, {
    './database-manager': dbmStub,
    'discord.js': discordStub,
    './pg-client': {},
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
