const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const adminPath = path.join(rootDir, 'admin.js');
const handlerPath = path.join(rootDir, 'interaction-handler.js');
const stubbed = new Set();

function stubModule(file, exports) {
  const filePath = path.isAbsolute(file) ? file : path.join(rootDir, file);
  require.cache[filePath] = { id: filePath, filename: filePath, loaded: true, exports };
  stubbed.add(filePath);
}

test('allIncomes returns message when no incomes exist', async () => {
  stubModule('db/incomes.js', { getAll: async () => [] });
  stubModule('clientManager.js', { getEmoji: () => '' });
  stubModule('shop.js', {});
  stubModule('logger.js', { debug() {}, info() {}, error() {} });
  stubModule('db/items.js', {});
  stubModule('db/keys.js', {});
  stubModule('db/characters.js', {});
  stubModule('db/editing-fields.js', {});
  const discordPath = require.resolve('discord.js');
  stubModule(discordPath, { ActionRowBuilder: class {}, ButtonBuilder: class {}, ButtonStyle: {}, EmbedBuilder: class {}, StringSelectMenuBuilder: class {}, StringSelectMenuOptionBuilder: class {}, createWebhook: () => {} });
  const axiosPath = require.resolve('axios');
  stubModule(axiosPath, {});

  delete require.cache[adminPath];
  const admin = require(adminPath);
  const reply = await admin.allIncomes();
  assert.equal(reply, 'No incomes found');
});

test('incomeSwitch handles empty incomes', async () => {
  stubModule('shop.js', {});
  stubModule('marketplace.js', { createSalesEmbed: async () => ['embed', []] });
  stubModule('panel.js', {});
  stubModule('logger.js', { debug() {}, info() {}, error() {} });
  stubModule('pg-client.js', {});
  stubModule('inventory-grants.js', { ensureItem: async () => {}, grantItemToPlayer: async () => {} });
  stubModule('db/characters.js', {});
  stubModule('admin.js', { allIncomes: async () => 'No incomes found' });

  delete require.cache[handlerPath];
  const handler = require(handlerPath);
  const interaction = {
    isModalSubmit: () => false,
    isButton: () => true,
    isSelectMenu: () => false,
    customId: 'switch_inco1',
    deferUpdate: async () => {},
    editReply: async (payload) => { interaction.edited = payload; },
    update: async () => {},
    reply: async () => {},
    user: { id: 'id', tag: 'User#0001' },
  };
  await handler.handle(interaction);
  assert.deepEqual(interaction.edited, { content: 'No incomes found', embeds: [], components: [] });
});

after(() => {
  for (const p of stubbed) delete require.cache[p];
  delete require.cache[adminPath];
  delete require.cache[handlerPath];
});
