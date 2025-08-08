const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const panelPath = path.join(__dirname, '..', 'panel.js');

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
  const panel = await t.mock.import(panelPath, {
    './dataGetters': { getCharFromNumericID: async () => 'ERROR' },
    './database-manager': { loadCollection: async () => ({}) },
    './clientManager': { getEmoji: () => ':coin:' },
    './shop': {},
    './char': {},
    'discord.js': discordStub(),
  });
  const [embed, rows] = await panel.mainEmbed('123');
  assert.equal(embed.description, 'Character not found.');
  assert.deepEqual(rows, []);
});

test('mainEmbed returns error when character data missing', async (t) => {
  const panel = await t.mock.import(panelPath, {
    './dataGetters': { getCharFromNumericID: async () => 'user1' },
    './database-manager': { loadCollection: async () => ({}) },
    './clientManager': { getEmoji: () => ':coin:' },
    './shop': {},
    './char': {},
    'discord.js': discordStub(),
  });
  const [embed, rows] = await panel.mainEmbed('123');
  assert.equal(embed.description, 'Character not found.');
  assert.deepEqual(rows, []);
});

test('shipsEmbed returns error when character lookup fails', async (t) => {
  const panel = await t.mock.import(panelPath, {
    './dataGetters': { getCharFromNumericID: async () => 'ERROR' },
    './database-manager': { loadCollection: async () => ({}) },
    './clientManager': { getEmoji: () => ':coin:' },
    './shop': {},
    './char': { getShips: async () => ({}) },
    'discord.js': discordStub(),
  });
  const [embed, rows] = await panel.shipsEmbed('123', 1);
  assert.equal(embed.description, 'Character not found.');
  assert.deepEqual(rows, []);
});
