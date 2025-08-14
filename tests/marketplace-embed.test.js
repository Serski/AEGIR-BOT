const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const marketplacePath = path.join(rootDir, 'marketplace.js');

const stubbed = new Set();
function stubModule(file, exports) {
  const filePath = path.join(rootDir, file);
  require.cache[filePath] = { id: filePath, filename: filePath, loaded: true, exports };
  stubbed.add(filePath);
}

(function setup() {
  stubModule('pg-client.js', { pool: {}, query: async () => ({}) });
  stubModule('db/inventory.js', {});
  stubModule('db/items.js', {});
  stubModule('db/marketplace.js', {
    async listSales() {
      return {
        rows: [
          { id: '1', name: 'Sword', item_id: 'sword', price: 10, quantity: 1, seller: 'user1' },
        ],
        totalCount: 1,
      };
    },
  });
})();

const { createSalesEmbed } = require(marketplacePath);

after(() => {
  for (const p of stubbed) delete require.cache[p];
});

test('createSalesEmbed shows item codes', async () => {
  const [embed] = await createSalesEmbed();
  assert.match(embed.data.description, /\(sword\)/);
});
