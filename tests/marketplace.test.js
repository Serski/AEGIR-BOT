const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const marketplacePath = path.join(rootDir, 'marketplace.js');
const discordPath = require.resolve('discord.js');

let pool;
let charData;
let shopData;
let balances;
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
    'Seller#1234': { inventory: { 'Iron Sword': 5 } },
    'Buyer#5678': { inventory: {} }
  };
  balances = { 'Seller#1234': 100, 'Buyer#5678': 200 };
  const dbmStub = {
    loadFile: async (collection, doc) => charData[doc],
    loadCollection: async collection => collection === 'shop' ? shopData : charData,
    saveFile: async (collection, doc, data) => { charData[doc] = data; },
    saveCollection: async (collection, data) => { if (collection === 'characters') charData = data; },
    getBalance: async id => balances[id] ?? 0,
    setBalance: async (id, amt) => { balances[id] = amt; }
  };
  stubModule('database-manager.js', dbmStub);

  const { newDb } = require('pg-mem');
  const mem = newDb();
  const pgMem = mem.adapters.createPg();
  pool = new pgMem.Pool();
  pool.query(`CREATE TABLE marketplace (id SERIAL PRIMARY KEY, name TEXT, data JSONB, item TEXT, price INTEGER, seller TEXT, seller_id TEXT)`);
  const origQuery = pool.query.bind(pool);
  pool.query = (text, params) => {
    if (/INSERT INTO marketplace \(name, data, seller, seller_id\)/i.test(text)) {
      const sale = params[1];
      return origQuery(
        'INSERT INTO marketplace (name, data, item, price, seller, seller_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
        [params[0], sale, sale.item_id, sale.price, params[2], params[3]]
      );
    }
    return origQuery(text, params);
  };
  stubModule('pg-client.js', { query: (text, params) => pool.query(text, params), pool });
})();

const marketplace = require(marketplacePath);
for (const p of stubbed) {
  if (p !== discordPath) delete require.cache[p];
}
stubbed.clear();
stubbed.add(discordPath);

after(() => {
  for (const p of stubbed) delete require.cache[p];
  delete require.cache[marketplacePath];
  if (pool) pool.end();
});

test('posting and buying a sale updates inventories and balances', async () => {
  // reset data
  charData = {
    'Seller#1234': { inventory: { 'Iron Sword': 5 } },
    'Buyer#5678': { inventory: {} }
  };
  balances = { 'Seller#1234': 100, 'Buyer#5678': 200 };
  await pool.query('DELETE FROM marketplace');

  // post sale
  const embed = await marketplace.postSale(2, 'iron sword', 50, 'Seller#1234', 'sellerId');
  const { rows } = await pool.query('SELECT id, item, price FROM marketplace');
  assert.equal(rows.length, 1);
  const saleID = rows[0].id;
  assert.equal(rows[0].price, 50);
  assert.equal(rows[0].item, 'Iron Sword');
  assert.equal(charData['Seller#1234'].inventory['Iron Sword'], 3);
  assert.ok(embed.description.includes('listed'));

  // buy sale
  const buyEmbed = await marketplace.buySale(saleID, 'Buyer#5678', 'buyerId');
  assert.equal(charData['Buyer#5678'].inventory['Iron Sword'], 2);
  assert.equal(balances['Seller#1234'], 150);
  assert.equal(balances['Buyer#5678'], 150);
  const { rows: remaining } = await pool.query('SELECT * FROM marketplace');
  assert.equal(remaining.length, 0);
  assert.ok(buyEmbed.description.includes('bought'));
});

test('postSale validates input', async () => {
  charData = {
    'Seller#1234': { inventory: { 'Iron Sword': 5 } }
  };
  balances = { 'Seller#1234': 100 };
  await pool.query('DELETE FROM marketplace');

  const badNumber = await marketplace.postSale(0, 'iron sword', 10, 'Seller#1234', 'sellerId');
  assert.equal(badNumber, 'You must sell at least one item!');

  const badPrice = await marketplace.postSale(1, 'iron sword', -5, 'Seller#1234', 'sellerId');
  assert.equal(badPrice, 'Price must be at least 0!');

  const noChar = await marketplace.postSale(1, 'iron sword', 10, 'Unknown#0000', 'id');
  assert.equal(noChar, 'Character not found!');
});

test('buySale validates characters and sale data', async () => {
  charData = {
    'Seller#1234': { inventory: { 'Iron Sword': 5 } },
    'Buyer#5678': { inventory: {} }
  };
  balances = { 'Seller#1234': 100, 'Buyer#5678': 200 };
  await pool.query('DELETE FROM marketplace');

  // insert sale with negative price
  let { rows } = await pool.query(
    "INSERT INTO marketplace (name, data, item, price, seller, seller_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id",
    ['Iron Sword', { item_id: 'Iron Sword', price: -10, quantity: 1 }, 'Iron Sword', -10, 'Seller#1234', 'sellerId']
  );
  let res = await marketplace.buySale(rows[0].id, 'Buyer#5678', 'buyerId');
  assert.equal(res, 'That sale has invalid data!');

  await pool.query('DELETE FROM marketplace');
  rows = await pool.query(
    "INSERT INTO marketplace (name, data, item, price, seller, seller_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id",
    ['Iron Sword', { item_id: 'Iron Sword', price: 10, quantity: -1 }, 'Iron Sword', 10, 'Seller#1234', 'sellerId']
  );
  res = await marketplace.buySale(rows.rows[0].id, 'Buyer#5678', 'buyerId');
  assert.equal(res, 'That sale has invalid data!');

  await pool.query('DELETE FROM marketplace');
  rows = await pool.query(
    "INSERT INTO marketplace (name, data, item, price, seller, seller_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id",
    ['Iron Sword', { item_id: 'Iron Sword', price: 10, quantity: 1 }, 'Iron Sword', 10, 'Seller#1234', 'sellerId']
  );
  delete charData['Buyer#5678'];
  delete balances['Buyer#5678'];
  res = await marketplace.buySale(rows.rows[0].id, 'Buyer#5678', 'buyerId');
  assert.equal(res, 'Character not found!');
});

