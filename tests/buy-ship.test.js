const { test } = require('node:test');
const Module = require('module');

// Simple mock import utility since node:test mocking is unavailable
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
const panelPath = path.join(root, 'panel.js');

test('buying a ship stores it and appears in ships panel', async (t) => {
  let charData = { numericID: 'usernum', balance: 100, inventory: {}, ships: {} };
  const shopData = {
    'Longboat': {
      infoOptions: { Category: 'Ships', Icon: ':ship:' },
      shopOptions: { 'Price (#)': 10, Channels: '', 'Need Role': '', 'Give Role': '' }
    }
  };
  const dbmShopStub = {
    loadCollection: async (col) => col === 'shop' ? shopData : { 'player1': charData },
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

  const reply = await shopModule.buyItem('Longboat', 'player1', 1, 'channel');
  assert.equal(reply, 'Succesfully bought 1 Longboat');
  assert.equal(charData.balance, 90);
  assert.ok(charData.ships['Longboat']);
  assert.strictEqual(charData.inventory['Longboat'], undefined);

  const panelModule = await mockImport(panelPath, {
    './dataGetters': { getCharFromNumericID: async () => 'player1' },
    './database-manager': { loadCollection: async (col) => col === 'shop' ? shopData : { 'player1': charData } },
    './pg-client': { query: async () => ({ rows: [{ id: 'Longboat' }] }) },
    './char': { getShips: async () => charData.ships },
    './shop': {},
    './clientManager': { getEmoji: () => ':coin:' },
    'discord.js': {
      EmbedBuilder: class {
        constructor() { this.description = null; this.title = null; this.footer = null; this.color = null; }
        setTitle(t) { this.title = t; return this; }
        setColor(c) { this.color = c; return this; }
        setDescription(d) { this.description = d; return this; }
        setFooter(f) { this.footer = f; return this; }
      },
      ButtonBuilder: class { setCustomId() { return this; } setLabel() { return this; } setStyle() { return this; } setDisabled() { return this; } },
      ButtonStyle: { Secondary: 1 },
      ActionRowBuilder: class { addComponents() { return this; } },
      StringSelectMenuBuilder: class { setCustomId() { return this; } addOptions() { return this; } },
      StringSelectMenuOptionBuilder: class { setLabel() { return this; } setValue() { return this; } setDescription() { return this; } }
    }
  });

  const [embed] = await panelModule.shipsEmbed('usernum', 1);
  assert.ok(embed.description.includes('Longboat'));
});

test('buying ship items with varied category casing routes to ships list', async (t) => {
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
        loadCollection: async (col) => col === 'shop' ? shopData : { 'player1': charData },
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

      const reply = await shopModule.buyItem('Longboat', 'player1', 1, 'channel');
      assert.equal(reply, 'Succesfully bought 1 Longboat');
      assert.equal(charData.balance, 90);
      assert.ok(charData.ships['Longboat']);
      assert.strictEqual(charData.inventory['Longboat'], undefined);
    });
  }
});
