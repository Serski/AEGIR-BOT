const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const root = path.join(__dirname, '..');
const shopPath = path.join(root, 'shop.js');

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
  };
}

function mockModule(modulePath, mock) {
  const resolved = require.resolve(modulePath);
  require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports: mock };
}

test('inventory embed shows non-stackable items', async () => {
  const charData = {
    player1: { numericID: 'player1', inventory: {} }
  };
  const shopData = {
    Sword: { infoOptions: { Category: 'Weapons', Icon: ':sword:' } }
  };
  const dbmStub = {
    loadCollection: async (col) => (col === 'characters' ? charData : shopData),
    saveCollection: async () => {},
    getInventory: async () => ({}),
    getInventoryItems: async () => [{ item_id: 'Sword' }],
  };
  const dataGettersStub = { getCharFromNumericID: async (id) => id };

  mockModule(path.join(root, 'database-manager.js'), dbmStub);
  mockModule(path.join(root, 'pg-client.js'), { query: async () => ({ rows: [] }) });
  mockModule(path.join(root, 'clientManager.js'), { getEmoji: () => ':coin:' });
  mockModule(path.join(root, 'dataGetters.js'), dataGettersStub);
  mockModule(path.join(root, 'logger.js'), { debug() {}, info() {}, error() {} });
  mockModule('discord.js', discordStub());

  const shopModule = require(shopPath);
  const [embed] = await shopModule.createInventoryEmbed('player1', 1);
  assert.ok(embed.description.includes('Sword'));
});

