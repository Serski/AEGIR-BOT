const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const root = path.join(__dirname, '..');
const shopPath = path.join(root, 'shop.js');
const panelPath = path.join(root, 'panel.js');

function mockRequire(modulePath, mocks) {
  const Module = require('module');
  const original = Module.prototype.require;
  Module.prototype.require = function (request) {
    if (Object.prototype.hasOwnProperty.call(mocks, request)) {
      return mocks[request];
    }
    return original.apply(this, arguments);
  };
  delete require.cache[require.resolve(modulePath)];
  const exported = require(modulePath);
  Module.prototype.require = original;
  return exported;
}

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
  const charPath = path.join(root, 'char.js');
  const charShopStub = { addShip: (data, name) => { if (!data.ships) data.ships = {}; data.ships[name] = {}; } };
  require.cache[require.resolve(charPath)] = { exports: charShopStub };
  const shopModule = mockRequire(shopPath, {
    './database-manager': dbmShopStub,
    './clientManager': { getUser: async () => ({ roles: { cache: { some: () => false }, add: () => {} } }) },
    './logger': { debug() {}, info() {}, error() {} },
    './pg-client': { query: async (q, params) => ({ rows: [{ id: params[0] }] }) }
  });

  const reply = await shopModule.buyItem('Longboat', 'player1', 1, 'channel');
  assert.equal(reply, 'Succesfully bought 1 Longboat');
  assert.equal(charData.balance, 90);
  assert.ok(charData.ships['Longboat']);
  assert.strictEqual(charData.inventory['Longboat'], undefined);

  delete require.cache[require.resolve(charPath)];
  const charPanelStub = { getShips: async () => charData.ships };
  require.cache[require.resolve(charPath)] = { exports: charPanelStub };
  const panelModule = mockRequire(panelPath, {
    './dataGetters': { getCharFromNumericID: async () => 'player1' },
    './database-manager': { loadCollection: async (col) => col === 'shop' ? shopData : { 'player1': charData } },
    './char': charPanelStub,
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
  delete require.cache[require.resolve(charPath)];
});
