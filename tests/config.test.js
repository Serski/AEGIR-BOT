const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const botPath = path.join(rootDir, 'bot.js');
const configPath = path.join(rootDir, 'config.js');
const discordModulePath = require.resolve('discord.js');
let pool;

// ── stub discord.js and other local modules ──────────────────────
(function setupStubs() {
  const discordStub = {
    Client: class Client {
      constructor() {
        this.user = { tag: 'stub' };
        this.commands = new Map();
      }
      login(token) { global.__capturedToken = token; return Promise.resolve(); }
      on() {}
      once(event, fn) { if (event === 'ready') fn(); }
    },
    GatewayIntentBits: { Guilds:1, GuildMessages:2, GuildMembers:4, MessageContent:8 },
    Collection: class Collection extends Map {},
    Events: { InteractionCreate: 'interactionCreate' }
  };
  require.cache[discordModulePath] = { id: discordModulePath, filename: discordModulePath, loaded: true, exports: discordStub };

  const stubModule = (file, exports) => {
    const filePath = path.join(rootDir, file);
    require.cache[filePath] = { id: filePath, filename: filePath, loaded: true, exports };
  };
    stubModule('interaction-handler.js', { handle: async () => {} });
    stubModule('char.js', { newChar: () => {}, resetIncomeCD: () => {} });
    const { newDb } = require('pg-mem');
    const mem = newDb();
    const pgMem = mem.adapters.createPg();
    pool = new pgMem.Pool();
    stubModule('pg-client.js', { query: (text, params) => pool.query(text, params), pool });
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
  if (require.cache[discordModulePath]) delete require.cache[discordModulePath];
  if (fs.existsSync(configPath)) fs.rmSync(configPath);
  if (require.cache[configPath]) delete require.cache[configPath];
  if (pool) pool.end();
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
  fs.rmSync(configPath, { force: true });
  if (require.cache[configPath]) delete require.cache[configPath];
});

test('Missing config.js and env vars throws error', () => {
  global.__capturedToken = null;
  assert.throws(() => {
    delete require.cache[require.resolve(botPath)];
    require(botPath);
  }, /Missing required environment variables/);
});
