const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const botPath = path.join(rootDir, 'bot.js');
const configPath = path.join(rootDir, 'config.js');
const nodeModulesPath = path.join(rootDir, 'node_modules');

// ── stub discord.js and other local modules ──────────────────────
(function setupStubs() {
  fs.rmSync(nodeModulesPath, { recursive: true, force: true });
  const discordDir = path.join(nodeModulesPath, 'discord.js');
  fs.mkdirSync(discordDir, { recursive: true });
  fs.writeFileSync(
    path.join(discordDir, 'index.js'),
`class Client {
  constructor() {
    this.user = { tag: 'stub' };
    this.commands = new Map();
  }
  login(token) { global.__capturedToken = token; return Promise.resolve(); }
  on() {}
  once(event, fn) { if (event === 'ready') fn(); }
}
const GatewayIntentBits = { Guilds:1, GuildMessages:2, GuildMembers:4, MessageContent:8 };
class Collection extends Map {}
const Events = { InteractionCreate: 'interactionCreate' };
module.exports = { Client, GatewayIntentBits, Collection, Events };
`);

  const stubModule = (file, exports) => {
    const filePath = path.join(rootDir, file);
    require.cache[filePath] = { id: filePath, filename: filePath, loaded: true, exports };
  };
  stubModule('interaction-handler.js', { handle: () => {} });
  stubModule('char.js', { newChar: () => {}, resetIncomeCD: () => {} });
  stubModule('database-manager.js', { loadFile: () => null, saveFile: () => {}, docDelete: () => {}, logData: () => {} });
  stubModule('admin.js', {});
})();

// stub fs.readdirSync to avoid loading command files
const originalReaddirSync = fs.readdirSync;
fs.readdirSync = function(p, opts) {
  if (typeof p === 'string' && p.endsWith('commands')) return [];
  return originalReaddirSync.call(this, p, opts);
};

after(() => {
  fs.readdirSync = originalReaddirSync;
  fs.rmSync(nodeModulesPath, { recursive: true, force: true });
  if (fs.existsSync(configPath)) fs.rmSync(configPath);
  if (require.cache[configPath]) delete require.cache[configPath];
});

// ── tests ────────────────────────────────────────────────────────

test('Environment variables override config.js', () => {
  global.__capturedToken = null;
  process.env.DISCORD_TOKEN = 'env-token';
  process.env.CLIENT_ID = 'env-client';
  process.env.GUILD_ID = 'env-guild';
  fs.writeFileSync(
    configPath,
    "module.exports = { token: 'file-token', clientId: 'file-client', guildId: 'file-guild' };"
  );

  delete require.cache[require.resolve(botPath)];
  const bot = require(botPath);

  assert.equal(global.__capturedToken, 'env-token');
  assert.equal(bot.getGuildID(), 'env-guild');

  delete process.env.DISCORD_TOKEN;
  delete process.env.CLIENT_ID;
  delete process.env.GUILD_ID;
  fs.rmSync(configPath);
  if (require.cache[configPath]) delete require.cache[configPath];
});

test('Absence of config.js does not cause errors', () => {
  global.__capturedToken = null;
  assert.doesNotThrow(() => {
    delete require.cache[require.resolve(botPath)];
    require(botPath);
  });
});
