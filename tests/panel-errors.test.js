const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const panelPath = path.join(rootDir, 'panel.js');

// helper to stub modules via require.cache
function loadPanelWithMocks(mocks) {
  const cacheKeys = [];
  for (const [relPath, exports] of Object.entries(mocks)) {
    const absPath = relPath.startsWith('.')
      ? path.join(rootDir, relPath)
      : require.resolve(relPath);
    cacheKeys.push(absPath);
    require.cache[absPath] = { id: absPath, filename: absPath, loaded: true, exports };
  }
  delete require.cache[panelPath];
  const panel = require(panelPath);
  return {
    panel,
    cleanup: () => {
      delete require.cache[panelPath];
      for (const k of cacheKeys) delete require.cache[k];
    },
  };
}

// minimal discord.js stub
function discordStub() {
  return {
    ActionRowBuilder: class { addComponents() { return this; } },
    ButtonBuilder: class { setCustomId() { return this; } setLabel() { return this; } setStyle() { return this; } setDisabled() { return this; } },
    ButtonStyle: { Secondary: 1 },
    EmbedBuilder: class {
      constructor() { this.description = null; this.color = null; this.title = null; this.footer = null; }
      setColor(c) { this.color = c; return this; }
      setDescription(d) { this.description = d; return this; }
      setTitle(t) { this.title = t; return this; }
      setFooter(f) { this.footer = f; return this; }
    },
    StringSelectMenuBuilder: class { setCustomId() { return this; } addOptions() { return this; } },
    StringSelectMenuOptionBuilder: class { setLabel() { return this; } setValue() { return this; } setDescription() { return this; } },
  };
}

test('mainEmbed returns error when character lookup fails', async (t) => {
  const { panel, cleanup } = loadPanelWithMocks({
    './database-manager.js': { loadCollection: async () => ({}) },
    './clientManager.js': { getEmoji: () => ':coin:' },
    './shop.js': {},
    './char.js': {},
    './pg-client.js': { query: async () => ({ rows: [] }) },
    'discord.js': discordStub(),
  });
  t.after(cleanup);
  const [embed, rows] = await panel.mainEmbed('123');
  assert.equal(embed.description, 'Character not found.');
  assert.deepEqual(rows, []);
});

test('mainEmbed returns error when character data missing', async (t) => {
  const { panel, cleanup } = loadPanelWithMocks({
    './database-manager.js': { loadCollection: async () => ({}) },
    './clientManager.js': { getEmoji: () => ':coin:' },
    './shop.js': {},
    './char.js': {},
    './pg-client.js': { query: async () => ({ rows: [] }) },
    'discord.js': discordStub(),
  });
  t.after(cleanup);
  const [embed, rows] = await panel.mainEmbed('123');
  assert.equal(embed.description, 'Character not found.');
  assert.deepEqual(rows, []);
});

test('shipsEmbed returns error when character lookup fails', async (t) => {
  let called = false;
  const { panel, cleanup } = loadPanelWithMocks({
    './dataGetters.js': { getCharFromNumericID: async () => 'ERROR' },
    './database-manager.js': {},
    './clientManager.js': { getEmoji: () => ':coin:' },
    './shop.js': {
      createCategoryEmbed: async () => { called = true; return [{}, []]; },
    },
    './pg-client.js': { query: async () => ({ rows: [] }) },
    'discord.js': discordStub(),
  });
  t.after(cleanup);
  const [embed, rows] = await panel.shipsEmbed('123', 1);
  assert.equal(embed.description, 'Character not found.');
  assert.deepEqual(rows, []);
  assert.equal(called, false);
});

test('shipsEmbed passes resolved ID to createCategoryEmbed', async (t) => {
  let receivedId;
  const { panel, cleanup } = loadPanelWithMocks({
    './dataGetters.js': { getCharFromNumericID: async () => 'User#0001' },
    './database-manager.js': {},
    './clientManager.js': { getEmoji: () => ':coin:' },
    './shop.js': {
      createCategoryEmbed: async (id) => {
        receivedId = id;
        return [{ description: 'ok' }, []];
      },
    },
    './pg-client.js': { query: async () => ({ rows: [{}] }) },
    'discord.js': discordStub(),
  });
  t.after(cleanup);
  const [embed, rows] = await panel.shipsEmbed('123', 1);
  assert.equal(receivedId, 'User#0001');
  assert.equal(embed.description, 'ok');
  assert.equal(rows.length, 1);
});

test('shipsEmbed returns error when character missing in database', async (t) => {
  let called = false;
  const { panel, cleanup } = loadPanelWithMocks({
    './dataGetters.js': { getCharFromNumericID: async () => 'User#0001' },
    './database-manager.js': {},
    './clientManager.js': { getEmoji: () => ':coin:' },
    './shop.js': {
      createCategoryEmbed: async () => { called = true; return [{}, []]; },
    },
    './pg-client.js': { query: async () => ({ rows: [] }) },
    'discord.js': discordStub(),
  });
  t.after(cleanup);
  const [embed, rows] = await panel.shipsEmbed('123', 1);
  assert.equal(embed.description, 'Character not found.');
  assert.deepEqual(rows, []);
  assert.equal(called, false);
});
