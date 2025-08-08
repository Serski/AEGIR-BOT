const db = require('./pg-client');
const logger = require('./logger');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const tables = ['characters', 'keys', 'shop', 'recipes', 'shoplayout', 'items', 'balances', 'inventories', 'inventory_items', 'cooldowns'];

function assertTable(name) {
  if (!tables.includes(name)) throw new Error(`Unknown table ${name}`);
  return name;
}

async function init() {
  logger.info('[database-manager] initializing tables...');

  // tables storing JSON blobs
  const jsonTables = ['characters', 'keys', 'shop', 'recipes', 'shoplayout', 'items'];
  for (const t of jsonTables) {
    await db.query(`CREATE TABLE IF NOT EXISTS ${t} (id TEXT PRIMARY KEY, data JSONB)`);
  }

  // index for quick lookups by numericID
  await db.query(
    "CREATE INDEX IF NOT EXISTS idx_characters_numericID ON characters ((data->>'numericID'))"
  );

  await db.query(
    `CREATE TABLE IF NOT EXISTS marketplace (
       id       SERIAL PRIMARY KEY,
       item     TEXT,
       category TEXT,
       price    INTEGER,
       number   INTEGER,
       seller   TEXT,
       seller_id TEXT
     )`
  );

  // normalized tables for balances, inventories, inventory items and cooldowns
  await db.query('CREATE TABLE IF NOT EXISTS balances (id TEXT PRIMARY KEY, amount INTEGER DEFAULT 0)');
  await db.query(
    `CREATE TABLE IF NOT EXISTS inventories (
       id   TEXT,
       item TEXT,
       qty  INTEGER,
       PRIMARY KEY (id, item)
     )`
  );
  await db.query(
    `CREATE TABLE IF NOT EXISTS inventory_items (
       instance_id TEXT PRIMARY KEY,
       owner_id    TEXT,
       item_id     TEXT,
       durability  INTEGER,
       metadata    JSONB
     )`
  );
  await db.query(
    `CREATE TABLE IF NOT EXISTS cooldowns (
       id         TEXT,
       action     TEXT,
       expires_at TIMESTAMPTZ,
       PRIMARY KEY (id, action)
     )`
  );

  await seedTableIfEmpty('shop', path.join(__dirname, 'seed-data', 'shop.json'));
  await seedTableIfEmpty('recipes', path.join(__dirname, 'seed-data', 'recipes.json'));
  await seedTableIfEmpty('keys', path.join(__dirname, 'seed-data', 'keys.json'));

  logger.info('[database-manager] initialization complete.');
}
init().catch(err => logger.error(err));

async function saveFile(collection, doc, data) {
  const table = assertTable(collection);
  await db.query(
    `INSERT INTO ${table} (id, data) VALUES ($1, $2)
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
    [doc, data]
  );
  logger.info(`Document "${doc}" saved in "${collection}" (db).`);
}

async function loadFile(collection, doc) {
  const table = assertTable(collection);
  const res = await db.query(`SELECT data FROM ${table} WHERE id=$1`, [doc]);
  return res.rows[0] ? res.rows[0].data : undefined;
}

async function saveCollection(collection, data) {
  const table = assertTable(collection);
  const entries = Object.entries(data);
  await db.query('BEGIN');
  try {
    for (const [id, value] of entries) {
      await db.query(
        `INSERT INTO ${table} (id, data) VALUES ($1, $2)
         ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
        [id, value]
      );
    }
    await db.query('COMMIT');
    logger.info(`Collection "${collection}" saved (${entries.length} docs).`);
  } catch (err) {
    await db.query('ROLLBACK');
    throw err;
  }
}

async function loadCollection(collection) {
  const table = assertTable(collection);
  const res = await db.query(`SELECT id, data FROM ${table}`);
  return res.rows.reduce((acc, row) => {
    acc[row.id] = row.data;
    return acc;
  }, {});
}

async function loadCollectionFileNames(collection) {
  const table = assertTable(collection);
  const res = await db.query(`SELECT id FROM ${table}`);
  return res.rows.reduce((acc, row) => ((acc[row.id] = row.id), acc), {});
}

async function docDelete(collection, doc) {
  const table = assertTable(collection);
  await db.query(`DELETE FROM ${table} WHERE id=$1`, [doc]);
}

async function fieldDelete(collection, doc, field) {
  const table = assertTable(collection);
  await db.query(`UPDATE ${table} SET data = data - $2 WHERE id=$1`, [doc, field]);
}

async function logData() {
  logger.debug('[database-manager] logData skipped (db backend).');
}

async function findCharacterByNumericID(numericID) {
  const res = await db.query(
    "SELECT id FROM characters WHERE data->>'numericID' = $1",
    [String(numericID)]
  );
  return res.rows[0] ? res.rows[0].id : undefined;
}

async function seedTableIfEmpty(table, filePath) {
  const countRes = await db.query(`SELECT COUNT(*) FROM ${table}`);
  if (Number(countRes.rows[0].count) === 0) {
    try {
      const seed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      for (const [id, data] of Object.entries(seed)) {
        await db.query(`INSERT INTO ${table} (id, data) VALUES ($1, $2)`, [id, data]);
      }
      logger.info(`[database-manager] seeded ${table} from ${filePath}`);
    } catch (err) {
      logger.error(`[database-manager] failed seeding ${table} from ${filePath}: ${err.message}`);
    }
  } else {
    logger.info(`[database-manager] ${table} already populated`);
  }
}

// --- balance helpers ---
async function getBalance(id) {
  const res = await db.query('SELECT amount FROM balances WHERE id=$1', [id]);
  return res.rows[0] ? Number(res.rows[0].amount) : 0;
}

async function setBalance(id, amount) {
  await db.query(
    `INSERT INTO balances (id, amount) VALUES ($1, $2)
     ON CONFLICT (id) DO UPDATE SET amount = EXCLUDED.amount`,
    [id, amount]
  );
}

async function getAllBalances() {
  const res = await db.query('SELECT id, amount FROM balances');
  return res.rows;
}

// --- inventory helpers ---
async function getInventory(id) {
  const res = await db.query('SELECT item, qty FROM inventories WHERE id=$1', [id]);
  return res.rows.reduce((acc, row) => ((acc[row.item] = Number(row.qty)), acc), {});
}

async function updateInventory(id, item, delta) {
  await db.query(
    `INSERT INTO inventories (id, item, qty) VALUES ($1, $2, $3)
     ON CONFLICT (id, item) DO UPDATE SET qty = inventories.qty + EXCLUDED.qty`,
    [id, item, delta]
  );
  await db.query('DELETE FROM inventories WHERE id=$1 AND item=$2 AND qty <= 0', [id, item]);
}

// --- item definition helpers ---
async function getItemDefinition(id) {
  const res = await db.query('SELECT data FROM items WHERE id=$1', [id]);
  return res.rows[0] ? res.rows[0].data : undefined;
}

async function saveItemDefinition(id, data) {
  await db.query(
    `INSERT INTO items (id, data) VALUES ($1,$2)
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
    [id, data]
  );
}

// --- inventory item instance helpers ---
async function addInventoryItem(ownerId, itemId, { instanceId = randomUUID(), durability = null, metadata = {} } = {}) {
  await db.query(
    `INSERT INTO inventory_items (instance_id, owner_id, item_id, durability, metadata)
     VALUES ($1,$2,$3,$4,$5)`,
    [instanceId, ownerId, itemId, durability, metadata]
  );
  return instanceId;
}

async function getInventoryItems(ownerId) {
  const res = await db.query('SELECT * FROM inventory_items WHERE owner_id=$1', [ownerId]);
  return res.rows;
}

async function removeInventoryItem(instanceId) {
  await db.query('DELETE FROM inventory_items WHERE instance_id=$1', [instanceId]);
}

// --- cooldown helpers ---
async function getCooldown(id, action) {
  const res = await db.query('SELECT expires_at FROM cooldowns WHERE id=$1 AND action=$2', [id, action]);
  return res.rows[0] ? res.rows[0].expires_at : null;
}

async function setCooldown(id, action, expiresAt) {
  await db.query(
    `INSERT INTO cooldowns (id, action, expires_at) VALUES ($1,$2,$3)
     ON CONFLICT (id, action) DO UPDATE SET expires_at = EXCLUDED.expires_at`,
    [id, action, expiresAt]
  );
}

async function clearCooldown(id, action) {
  await db.query('DELETE FROM cooldowns WHERE id=$1 AND action=$2', [id, action]);
}

module.exports = {
  saveCollection,
  loadCollection,
  loadCollectionFileNames,
  saveFile,
  loadFile,
  findCharacterByNumericID,
  docDelete,
  fieldDelete,
  logData,
  getBalance,
  setBalance,
  getAllBalances,
  getInventory,
  updateInventory,
  getItemDefinition,
  saveItemDefinition,
  addInventoryItem,
  getInventoryItems,
  removeInventoryItem,
  getCooldown,
  setCooldown,
  clearCooldown,
};
