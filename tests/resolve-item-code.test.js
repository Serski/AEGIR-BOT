const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
let pool;
const stubbed = new Set();

function stubModule(file, exports) {
  const filePath = path.join(rootDir, file);
  require.cache[filePath] = { id: filePath, filename: filePath, loaded: true, exports };
  stubbed.add(filePath);
}

test('resolveItemCode throws on missing or ambiguous names', async () => {
  const { newDb } = require('pg-mem');
  const mem = newDb();
  const pgMem = mem.adapters.createPg();
  pool = new pgMem.Pool();
  await pool.query("CREATE TABLE items (id TEXT PRIMARY KEY, data JSONB)");
  await pool.query("INSERT INTO items (id, data) VALUES ('sword', '{\"name\":\"Sword\"}'), ('sword_dup', '{\"name\":\"Sword\"}'), ('shield', '{\"name\":\"Shield\"}')");

  stubModule('pg-client.js', { pool, query: (text, params) => pool.query(text, params) });

  const items = require(path.join(rootDir, 'db/items.js'));

  await assert.rejects(items.resolveItemCode('unknown'), /No item/);
  await assert.rejects(items.resolveItemCode('Sword'), /Multiple items/);
  assert.equal(await items.resolveItemCode('shield'), 'shield');
});

after(() => {
  for (const p of stubbed) delete require.cache[p];
  if (pool) pool.end();
});
