const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const root = path.join(__dirname, '..');
const shopPath = path.join(root, 'shop.js');
const panelPath = path.join(root, 'panel.js');

function discordStub() {
  return {
    ActionRowBuilder: class { addComponents() { return this; } },
    ButtonBuilder: class { setCustomId() { return this; } setLabel() { return this; } setStyle() { return this; } setDisabled() { return this; } },
    ButtonStyle: { Secondary: 1 },
    EmbedBuilder: class {
      constructor() { this.description = null; this.title = null; this.footer = null; this.color = null; }
      setTitle(t) { this.title = t; return this; }
      setColor(c) { this.color = c; return this; }
      setDescription(d) { this.description = d; return this; }
      setFooter(f) { this.footer = f; return this; }
    },
    StringSelectMenuBuilder: class { setCustomId() { return this; } addOptions() { return this; } },
    StringSelectMenuOptionBuilder: class { setLabel() { return this; } setValue() { return this; } setDescription() { return this; } },
  };
}

function mockModule(modulePath, mock) {
  const resolved = require.resolve(modulePath);
  require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports: mock };
}

test('resources and ships appear only in their submenus', async () => {
  const charData = {
    player1: {
      inventory: { Sword: 2 },
      storage: { Iron: 5 },
      ships: { Longboat: {} },
      balance: 0,
      numericID: 'player1'
    }
  };
  const shopData = {
    Longboat: { infoOptions: { Category: 'Ships', Icon: ':ship:' } },
    Iron: { infoOptions: { Category: 'Resources', Icon: ':iron:' } },
    Sword: { infoOptions: { Category: 'Weapons', Icon: ':sword:' } }
  };
  const dbmStub = {
    loadCollection: async (col) => col === 'characters' ? charData : shopData,
    saveCollection: async () => {},
    getInventory: async (id) => (charData[id] ? charData[id].inventory : {})
  };
  const dataGettersStub = { getCharFromNumericID: async (id) => id };

  mockModule(path.join(root, 'database-manager.js'), dbmStub);
  mockModule(path.join(root, 'pg-client.js'), { query: async () => ({ rows: [] }) });
  mockModule(path.join(root, 'clientManager.js'), { getEmoji: () => ':coin:' });
  mockModule(path.join(root, 'dataGetters.js'), dataGettersStub);
  mockModule(path.join(root, 'logger.js'), { debug() {}, info() {}, error() {} });
  mockModule('discord.js', discordStub());

  const shopModule = require(shopPath);
  const panelModule = require(panelPath);

  const [invEmbed] = await panelModule.inventoryEmbed('player1', 1);
  assert.ok(invEmbed.description.includes('Sword'));
  assert.ok(!invEmbed.description.includes('Longboat'));
  assert.ok(!invEmbed.description.includes('Iron'));

  const [resEmbed] = await panelModule.storageEmbed('player1', 1);
  assert.ok(resEmbed.description.includes('Iron'));
  assert.ok(!resEmbed.description.includes('Longboat'));
  assert.ok(!resEmbed.description.includes('Sword'));

  const [shipEmbed] = await panelModule.shipsEmbed('player1', 1);
  assert.ok(shipEmbed.description.includes('Longboat'));
  assert.ok(!shipEmbed.description.includes('Iron'));
  assert.ok(!shipEmbed.description.includes('Sword'));
});

