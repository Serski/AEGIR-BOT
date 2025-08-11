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
    StringSelectMenuBuilder: class { setCustomId() { return this; } addOptions() { return this; } },
    StringSelectMenuOptionBuilder: class { setLabel() { return this; } setValue() { return this; } setDescription() { return this; } },
  };
}

function mockModule(modulePath, mock) {
  const resolved = require.resolve(modulePath);
  require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports: mock };
}

test('createCategoryEmbed remaps legacy item names via findItemName', async () => {
  delete require.cache[require.resolve(shopPath)];

  const charData = { 'Player#0001': { inventory: { wood: 2 }, numericID: 'player1' } };
  const shopData = { Wood: { infoOptions: { Category: 'Resources', Icon: ':wood:' } } };
  const dbmStub = {
    loadCollection: async (col) => (col === 'characters' ? charData : shopData),
    saveCollection: async () => {},
  };
  const dataGettersStub = { getCharFromNumericID: async (id) => id };

  mockModule(path.join(root, 'database-manager.js'), dbmStub);
  mockModule(path.join(root, 'pg-client.js'), { query: async () => ({ rows: [{ id: 'Wood' }] }) });
  mockModule(path.join(root, 'clientManager.js'), { getEmoji: () => ':coin:' });
  mockModule(path.join(root, 'dataGetters.js'), dataGettersStub);
  mockModule(path.join(root, 'logger.js'), { debug() {}, info() {}, error() {} });
  mockModule('discord.js', discordStub());

  const shopModule = require(shopPath);
  const [embed] = await shopModule.createCategoryEmbed('Player#0001', 'Resources', 1);
  assert.ok(embed.description.includes('Wood'));
  assert.ok(!('wood' in charData['Player#0001'].inventory));
});

test('createCategoryEmbed categorizes unknown items as misc', async () => {
  delete require.cache[require.resolve(shopPath)];

  const charData = { 'Player#0001': { inventory: { Mystery: 1 }, numericID: 'player1' } };
  const shopData = {};
  const dbmStub = {
    loadCollection: async (col) => (col === 'characters' ? charData : shopData),
    saveCollection: async () => {},
  };
  const dataGettersStub = { getCharFromNumericID: async (id) => id };

  mockModule(path.join(root, 'database-manager.js'), dbmStub);
  mockModule(path.join(root, 'pg-client.js'), { query: async () => ({ rows: [] }) });
  mockModule(path.join(root, 'clientManager.js'), { getEmoji: () => ':coin:' });
  mockModule(path.join(root, 'dataGetters.js'), dataGettersStub);
  mockModule(path.join(root, 'logger.js'), { debug() {}, info() {}, error() {} });
  mockModule('discord.js', discordStub());

  const shopModule = require(shopPath);
  const [embed] = await shopModule.createCategoryEmbed('Player#0001', 'Misc', 1);
  assert.ok(embed.description.includes('Mystery'));
});
