const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const dbmPath = path.join(rootDir, 'database-manager.js');
const dataGettersPath = path.join(rootDir, 'dataGetters.js');
const pgClientPath = path.join(rootDir, 'pg-client.js');
const loggerPath = path.join(rootDir, 'logger.js');

let pool;

(function setup() {
  const { newDb } = require('pg-mem');
  const mem = newDb();
  const pgMem = mem.adapters.createPg();
  pool = new pgMem.Pool();
  // pre-create characters table so tests can run immediately
  pool.query('CREATE TABLE characters (id TEXT PRIMARY KEY, data JSONB)');

  require.cache[pgClientPath] = {
    id: pgClientPath,
    filename: pgClientPath,
    loaded: true,
    exports: { query: (text, params) => pool.query(text, params), pool }
  };

  require.cache[loggerPath] = {
    id: loggerPath,
    filename: loggerPath,
    loaded: true,
    exports: { info() {}, debug() {}, error() {} }
  };
})();

const dbm = require(dbmPath);
const dataGetters = require(dataGettersPath);

after(() => {
  delete require.cache[dbmPath];
  delete require.cache[dataGettersPath];
  delete require.cache[pgClientPath];
  delete require.cache[loggerPath];
  if (pool) pool.end();
});

test('getCharFromNumericID retrieves matching character', async () => {
  await dbm.saveFile('characters', 'UserOne#0001', { numericID: 101 });
  await dbm.saveFile('characters', 'UserTwo#0002', { numericID: 202 });

  assert.equal(await dataGetters.getCharFromNumericID(202), 'UserTwo#0002');
  assert.equal(await dataGetters.getCharFromNumericID(999), 'ERROR');
});

