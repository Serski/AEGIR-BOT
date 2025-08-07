const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const marketplacePath = path.join(rootDir, 'marketplace.js');
const dbmPath = path.join(rootDir, 'database-manager.js');
const shopPath = path.join(rootDir, 'shop.js');
const clientManagerPath = path.join(rootDir, 'clientManager.js');
const loggerPath = path.join(rootDir, 'logger.js');
const pgClientPath = path.join(rootDir, 'pg-client.js');
const discordPath = require.resolve('discord.js');

let pool;
let charData;
let shopData;
const stubbed = new Set([discordPath]);

function stubModule(file, exports) {
  const filePath = path.join(rootDir, file);
  require.cache[filePath] = { id: filePath, filename: filePath, loaded: true, exports };
  stubbed.add(filePath);
}

(function setup() {
  class EmbedBuilder {
    setDescription(d) { this.description = d; return this; }
    setFooter(f) { this.footer = f; return this; }
    setTitle(t) { this.title = t; return this; }
    setColor(c) { this.color = c; return this; }
  }
  const discordStub = { EmbedBuilder, ButtonBuilder: class {}, ButtonStyle: { Secondary: 0 }, ActionRowBuilder: class {} };
  require.cache[discordPath] = { id: discordPath, filename: discordPath, loaded: true, exports: discordStub };

  stubModule('logger.js', { debug() {}, info() {}, error() {} });
  stubModule('clientManager.js', { getEmoji: () => ':coin:' });
  shopData = { 'Iron Sword': { infoOptions: { 'Transferrable (Y/N)': 'Yes' } } };
  const shopStub = {
    findItemName: async name => name.toLowerCase() === 'iron sword' ? 'Iron Sword' : 'ERROR',
    getItemCategory: async () => 'Weapons',
    getItemIcon: async () => ':sword:'
  };
  stubModule('shop.js', shopStub);

  charData = {
    'Seller#1234': { inventory: { 'Iron Sword': 5 }, balance: 100 },
    'Buyer#5678': { inventory: {}, balance: 200 }
  };
  const dbmStub = {
    loadFile: async (collection, doc) => charData[doc],
    loadCollection: async collection => collection === 'shop' ? shopData : charData,
    saveFile: async (collection, doc, data) => { charData[doc] = data; },
    saveCollection: async (collection, data) => { if (collection === 'characters') charData = data; }
  };
  stubModule('database-manager.js', dbmStub);

  const { newDb } = require('pg-mem');
  const mem = newDb();
  const pgMem = mem.adapters.createPg();
  pool = new pgMem.Pool();
  pool.query('CREATE TABLE marketplace (id SERIAL PRIMARY KEY, item TEXT, category TEXT, price INTEGER, number INTEGER, seller TEXT, seller_id TEXT)');
  stubModule('pg-client.js', { query: (text, params) => pool.query(text, params), pool });
})();

const marketplace = require(marketplacePath);

after(() => {
  for (const p of stubbed) delete require.cache[p];
  delete require.cache[marketplacePath];
  if (pool) pool.end();
});

test('posting and buying a sale updates inventories and balances', async () => {
  // reset data
  charData = {
    'Seller#1234': { inventory: { 'Iron Sword': 5 }, balance: 100 },
    'Buyer#5678': { inventory: {}, balance: 200 }
  };
  await pool.query('DELETE FROM marketplace');

  // post sale
  const embed = await marketplace.postSale(2, 'iron sword', 50, 'Seller#1234', 'sellerId');
  const { rows } = await pool.query('SELECT id FROM marketplace');
  assert.equal(rows.length, 1);
  const saleID = rows[0].id;
  assert.equal(charData['Seller#1234'].inventory['Iron Sword'], 3);
  assert.ok(embed.description.includes('listed'));

  // buy sale
  const buyEmbed = await marketplace.buySale(saleID, 'Buyer#5678', 'buyerId');
  assert.equal(charData['Buyer#5678'].inventory['Iron Sword'], 2);
  assert.equal(charData['Seller#1234'].balance, 150);
  assert.equal(charData['Buyer#5678'].balance, 150);
  const { rows: remaining } = await pool.query('SELECT * FROM marketplace');
  assert.equal(remaining.length, 0);
  assert.ok(buyEmbed.description.includes('bought'));
});
