const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const handlerPath = path.join(rootDir, 'interaction-handler.js');
const configPath = path.join(rootDir, 'config.js');
const discordModulePath = require.resolve('discord.js');
const stubbed = new Set([discordModulePath]);
let pool;

function stubModule(file, exports) {
  const filePath = path.join(rootDir, file);
  require.cache[filePath] = { id: filePath, filename: filePath, loaded: true, exports };
  stubbed.add(filePath);
}

function setupHandler(panelImpl) {
  const discordStub = {
    Client: class Client { constructor() { this.user = { tag: 'stub' }; this.commands = new Map(); } login() { return Promise.resolve(); } on() {} once(_, fn) { fn(); } },
    GatewayIntentBits: { Guilds:1, GuildMessages:2, GuildMembers:4, MessageContent:8 },
    Collection: class Collection extends Map {},
    Events: { InteractionCreate: 'interactionCreate' }
  };
  require.cache[discordModulePath] = { id: discordModulePath, filename: discordModulePath, loaded: true, exports: discordStub };

  fs.writeFileSync(configPath, 'module.exports = { guildId: "test" };');
  delete require.cache[configPath];
  stubModule('shop.js', {});
  stubModule('char.js', {});
  stubModule('marketplace.js', {});
  stubModule('admin.js', {});
  stubModule('logger.js', { debug: () => {} });
  const { newDb } = require('pg-mem');
  const mem = newDb();
  const pgMem = mem.adapters.createPg();
  pool = new pgMem.Pool();
  stubModule('pg-client.js', { query: (text, params) => pool.query(text, params), pool });
  stubModule('panel.js', panelImpl);
  delete require.cache[handlerPath];
  return require(handlerPath);
}

function createSelectInteraction(value) {
  const interaction = {
    isModalSubmit: () => false,
    isButton: () => false,
    isSelectMenu: () => true,
    customId: 'panel_select',
    values: [value],
    user: { id: 'user123', tag: 'stub' },
    update: async (payload) => { interaction.updated = payload; }
  };
  return interaction;
}

function createButtonInteraction(customId) {
  const interaction = {
    isModalSubmit: () => false,
    isButton: () => true,
    isSelectMenu: () => false,
    customId,
    user: { id: 'user123', tag: 'stub' },
    update: async (payload) => { interaction.updated = payload; }
  };
  return interaction;
}

function customIdWithFix(base, page) {
  return {
    value: base + page,
    substring(start, end) {
      if (start === 0 && end === base.length + 1) return base;
      return this.value.substring(start, end);
    },
    slice(start) { return this.value.slice(start - 1); }
  };
}

after(() => {
  for (const p of stubbed) delete require.cache[p];
  delete require.cache[handlerPath];
  delete require.cache[configPath];
  fs.rmSync(configPath, { force: true });
  if (pool) pool.end();
});

// panel_select switching
function panelSelectTest(choice, expectedFn) {
  return async () => {
    let called;
    const panelStub = {
      inventoryEmbed: async (id, page) => { called = { fn: 'inventory', id, page }; return ['invEmbed', ['invRow']]; },
      storageEmbed: async (id, page) => { called = { fn: 'resources', id, page }; return ['storeEmbed', ['storeRow']]; },
      shipsEmbed: async (id, page) => { called = { fn: 'ships', id, page }; return ['shipEmbed', ['shipRow']]; },
      mainEmbed: async (id) => { called = { fn: 'main', id }; return ['mainEmbed', ['mainRow']]; }
    };
    const handler = setupHandler(panelStub);
    const interaction = createSelectInteraction(choice);
    await handler.handle(interaction);
    assert.equal(called.fn, expectedFn);
    assert.equal(called.id, 'user123');
    if (called.page) assert.equal(called.page, 1);
    const expectedEmbed = {
      inventory: 'invEmbed',
      resources: 'storeEmbed',
      ships: 'shipEmbed',
      main: 'mainEmbed'
    }[expectedFn];
    const expectedRow = {
      inventory: ['invRow'],
      resources: ['storeRow'],
      ships: ['shipRow'],
      main: ['mainRow']
    }[expectedFn];
    assert.deepEqual(interaction.updated, { embeds: [expectedEmbed], components: expectedRow, ephemeral: true });
  };
}

test('panel_select inventory', panelSelectTest('inventory', 'inventory'));
test('panel_select resources', panelSelectTest('resources', 'resources'));
test('panel_select ships', panelSelectTest('ships', 'ships'));
test('panel_select back', panelSelectTest('back', 'main'));

// pagination buttons
function paginationTest(customId, expectedFn, expectedPage) {
  return async () => {
    let called;
    const panelStub = {
      inventoryEmbed: async (id, page) => { called = { fn: 'inventory', id, page }; return ['invEmbed', ['invRow']]; },
      storageEmbed: async (id, page) => { called = { fn: 'storage', id, page }; return ['storeEmbed', ['storeRow']]; },
      shipsEmbed: async (id, page) => { called = { fn: 'ships', id, page }; return ['shipEmbed', ['shipRow']]; }
    };
    const handler = setupHandler(panelStub);
    const interaction = createButtonInteraction(customId);
    await handler.handle(interaction);
    assert.equal(called.fn, expectedFn);
    assert.deepEqual(called, { fn: expectedFn, id: 'user123', page: expectedPage });
    const expectedEmbed = {
      inventory: 'invEmbed',
      storage: 'storeEmbed',
      ships: 'shipEmbed'
    }[expectedFn];
    const expectedRow = {
      inventory: ['invRow'],
      storage: ['storeRow'],
      ships: ['shipRow']
    }[expectedFn];
    assert.deepEqual(interaction.updated, { embeds: [expectedEmbed], components: expectedRow, ephemeral: true });
  };
}

test('panel_inv_page button', paginationTest(customIdWithFix('panel_inv_page', '2'), 'inventory', 2));
test('panel_store_page button', paginationTest('panel_store_page3', 'storage', 3));
test('panel_ship_page button', paginationTest('panel_ship_page4', 'ships', 4));
