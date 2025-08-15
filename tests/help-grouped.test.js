const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const adminPath = path.join(rootDir, 'admin.js');

function loadAdminWithMocks(mocks) {
  const cacheKeys = [];
  for (const [relPath, exports] of Object.entries(mocks)) {
    const absPath = relPath.startsWith('.')
      ? path.join(rootDir, relPath)
      : require.resolve(relPath);
    cacheKeys.push(absPath);
    require.cache[absPath] = { id: absPath, filename: absPath, loaded: true, exports };
  }
  delete require.cache[adminPath];
  const admin = require(adminPath);
  return {
    admin,
    cleanup: () => {
      delete require.cache[adminPath];
      for (const k of cacheKeys) delete require.cache[k];
    }
  };
}

function discordStub() {
  return {
    ActionRowBuilder: class { addComponents() { return this; } },
    ButtonBuilder: class { setCustomId() { return this; } setLabel() { return this; } setStyle() { return this; } },
    ButtonStyle: { Secondary: 1 },
    EmbedBuilder: class {
      constructor() { this.title = null; this.description = null; this.fields = []; this.footer = null; }
      setTitle(t) { this.title = t; return this; }
      setDescription(d) { this.description = d; return this; }
      addFields(...fields) { this.fields.push(...fields); return this; }
      setFooter(f) { this.footer = f; return this; }
    },
    StringSelectMenuBuilder: class {},
    StringSelectMenuOptionBuilder: class {},
  };
}

test('generalHelpMenu groups commands by category', async (t) => {
  const commandList = {
    alpha: { description: 'Alpha command', category: 'charCommands' },
    beta: { description: 'Beta command', category: 'shopCommands' }
  };

  const { admin, cleanup } = loadAdminWithMocks({
    './db/keys.js': { get: async () => commandList },
    './db/kingdoms.js': {},
    axios: {},
    './shop.js': {},
    './clientManager.js': {},
    './logger.js': { debug() {}, info() {}, warn() {}, error() {} },
    './db/incomes.js': {},
    './db/items.js': {},
    './db/characters.js': {},
    './db/editing-fields.js': {},
    'discord.js': discordStub(),
  });
  t.after(cleanup);

  const [embed] = await admin.generalHelpMenu(1, false);
  assert.equal(embed.title, 'Character Commands');
  assert.equal(embed.fields.length, 1);
  assert.equal(embed.fields[0].name, '/alpha');
  assert.equal(embed.fields[0].value, 'Alpha command');
});
