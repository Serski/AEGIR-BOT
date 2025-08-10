const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const root = path.join(__dirname, '..');
const panelPath = path.join(root, 'panel.js');

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

function mockModule(modulePath, mock) {
  let resolved;
  try {
    resolved = require.resolve(modulePath);
  } catch {
    resolved = modulePath;
  }
  require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports: mock };
}

function loadPanel(overrides = {}) {
  const baseMocks = {
    [path.join(root, 'dataGetters.js')]: { getCharFromNumericID: async () => 'ERROR' },
    [path.join(root, 'database-manager.js')]: { loadCollection: async () => ({}) },
    [path.join(root, 'clientManager.js')]: { getEmoji: () => ':coin:' },
    [path.join(root, 'shop.js')]: {},
    [path.join(root, 'char.js')]: { getShips: async () => ({}) },
    'discord.js': discordStub(),
  };
  const mocks = { ...baseMocks, ...overrides };
  for (const [mod, mock] of Object.entries(mocks)) {
    mockModule(mod, mock);
  }
  delete require.cache[require.resolve(panelPath)];
  return require(panelPath);
}

test('mainEmbed returns error when character lookup fails', async () => {
  const panel = loadPanel({
    [path.join(root, 'dataGetters.js')]: { getCharFromNumericID: async () => 'ERROR' },
  });
  const [embed, rows] = await panel.mainEmbed('123');
  assert.equal(embed.description, 'Character not found.');
  assert.deepEqual(rows, []);
});

test('mainEmbed returns error when character data missing', async () => {
  const panel = loadPanel({
    [path.join(root, 'dataGetters.js')]: { getCharFromNumericID: async () => 'user1' },
  });
  const [embed, rows] = await panel.mainEmbed('123');
  assert.equal(embed.description, 'Character not found.');
  assert.deepEqual(rows, []);
});

test('shipsEmbed returns error when character lookup fails', async () => {
  const panel = loadPanel({
    [path.join(root, 'dataGetters.js')]: { getCharFromNumericID: async () => 'ERROR' },
  });
  const [embed, rows] = await panel.shipsEmbed('123', 1);
  assert.equal(embed.description, 'Character not found.');
  assert.deepEqual(rows, []);
});
