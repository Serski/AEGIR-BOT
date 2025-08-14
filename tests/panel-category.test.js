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
  mockModule(path.join(root, 'pg-client.js'), {
    query: async (text, params = []) => {
      if (text.includes("category = 'Resources'")) {
        return { rows: [{ character_id:'Player#0001', item_id:'Iron', quantity:5, name:'Iron', category:'Resources', icon: ':iron:' }] };
      }
      if (params[1] === 'Ships') {
        return { rows: [{ character_id:'Player#0001', item_id:'Longboat', quantity:1, name:'Longboat', category:'Ships', icon: ':ship:' }] };
      }
      if (text.includes('FROM v_inventory')) {
        return { rows: [
          { character_id:'Player#0001', item_id:'Sword', quantity:2, name:'Sword', category:'Weapons', icon: ':sword:' },
          { character_id:'Player#0001', item_id:'Iron', quantity:5, name:'Iron', category:'Resources', icon: ':iron:' },
          { character_id:'Player#0001', item_id:'Longboat', quantity:1, name:'Longboat', category:'Ships', icon: ':ship:' },
        ] };
      }
      return { rows: [{ id: 'dummy' }] };
    },
  });
  mockModule(path.join(root, 'clientManager.js'), { getEmoji: () => ':coin:' });
  mockModule(path.join(root, 'logger.js'), { debug() {}, info() {}, error() {} });
  mockModule('discord.js', discordStub());

  const shopModule = require(shopPath);
  const panelModule = require(panelPath);

  const [invEmbed] = await panelModule.inventoryEmbed('Player#0001', 1);
  assert.ok(invEmbed.description.includes('Sword'));
  assert.ok(!invEmbed.description.includes('Longboat'));
  assert.ok(!invEmbed.description.includes('Iron'));

  const [resEmbed] = await panelModule.storageEmbed('Player#0001', 1);
  assert.ok(resEmbed.description.includes('Iron'));
  assert.ok(!resEmbed.description.includes('Longboat'));
  assert.ok(!resEmbed.description.includes('Sword'));

  const [shipEmbed] = await panelModule.shipsEmbed('Player#0001', 1);
  assert.ok(shipEmbed.description.includes('Longboat'));
  assert.ok(!shipEmbed.description.includes('Iron'));
  assert.ok(!shipEmbed.description.includes('Sword'));
});

