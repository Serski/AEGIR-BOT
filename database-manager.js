/**
 * @deprecated Legacy database helper. Prefer direct pg-client queries and modules under ./db.
 */
const db = require('./pg-client');
const logger = require('./logger');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const tables = [
  'characters',
  'keys',
  'shop',
  'recipes',
  'shoplayout',
  'items',
  'balances',
  'inventories',
  'inventory_items',
  'item_instances',
  'cooldowns',
];

function assertTable(name) {
  if (!tables.includes(name)) throw new Error(`Unknown table ${name}`);
  return name;
}

async function init() {
  logger.info('[database-manager] initializing tables...');
  try {
    await db.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
  } catch (err) {
    logger.warn ? logger.warn('[database-manager] failed to enable pgcrypto', err) : console.warn(err);
  }

  // tables storing JSON blobs
  const jsonTables = ['characters', 'keys', 'shop', 'recipes', 'shoplayout', 'items'];
  for (const t of jsonTables) {
    await db.query(`CREATE TABLE IF NOT EXISTS ${t} (id TEXT PRIMARY KEY, data JSONB)`);
  }

  // index for quick lookups by numeric_id
  await db.query(
    "CREATE INDEX IF NOT EXISTS idx_characters_numeric_id ON characters ((data->>'numeric_id'))"
  );

  await db.query(
    `CREATE TABLE IF NOT EXISTS marketplace (
       id        TEXT PRIMARY KEY,
       name      TEXT,
       item_code TEXT,
       price     INTEGER,
       seller    TEXT,
       quantity  INTEGER
     )`
  );

  await db.query(
    `CREATE TABLE IF NOT EXISTS incomes (
       name       TEXT PRIMARY KEY,
       gold_given INTEGER,
       item_code  TEXT,
       item_amount INTEGER,
       emoji      TEXT,
       roles      JSONB,
       delay      TEXT
     )`
  );

  // normalized tables for balances, inventories, inventory items and cooldowns
  await db.query(
    'CREATE TABLE IF NOT EXISTS balances (id TEXT PRIMARY KEY, amount INTEGER DEFAULT 0)'
  );
  await db.query(
    `CREATE TABLE IF NOT EXISTS inventories (
       id SERIAL PRIMARY KEY,
       owner_id TEXT UNIQUE
     )`
  );
  await db.query(
    `CREATE TABLE IF NOT EXISTS inventory_items (
       inventory_id INTEGER,
       item_id      TEXT,
       quantity     INTEGER,
       PRIMARY KEY (inventory_id, item_id)
     )`
  );
  await db.query(
    `CREATE TABLE IF NOT EXISTS item_instances (
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

  logger.info('[database-manager] initialization complete.');
}
init().catch(err => (logger.error ? logger.error(err) : console.error(err)));

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
    "SELECT id FROM characters WHERE data->>'numeric_id' = $1",
    [String(numericID)]
  );
  return res.rows[0] ? res.rows[0].id : undefined;
}

async function getEditingFields(id) {
  const res = await db.query(
    "SELECT data->'editingFields' AS editingFields FROM characters WHERE id=$1",
    [id]
  );
  return res.rows[0] ? res.rows[0].editingfields : undefined;
}

async function setEditingFields(id, editingFields) {
  await db.query(
    `INSERT INTO characters (id, data) VALUES ($1, jsonb_build_object('editingFields', $2::jsonb))
     ON CONFLICT (id) DO UPDATE SET data = jsonb_set(COALESCE(characters.data, '{}'::jsonb), '{editingFields}', $2::jsonb)`,
    [id, editingFields]
  );
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
async function createInventory(ownerId) {
  const res = await db.query(
    `INSERT INTO inventories (owner_id) VALUES ($1)
     ON CONFLICT (owner_id) DO UPDATE SET owner_id = EXCLUDED.owner_id
     RETURNING id`,
    [ownerId]
  );
  return res.rows[0].id;
}

async function getInventory(ownerId) {
  const invRes = await db.query('SELECT id FROM inventories WHERE owner_id=$1', [ownerId]);
  if (!invRes.rows[0]) return {};
  const invId = invRes.rows[0].id;
  const res = await db.query(
    'SELECT item_id, quantity FROM inventory_items WHERE inventory_id=$1',
    [invId]
  );
  return res.rows.reduce((acc, row) => ((acc[row.item_id] = Number(row.quantity)), acc), {});
}

async function getInventoryItem(ownerId, itemId) {
  const invRes = await db.query('SELECT id FROM inventories WHERE owner_id=$1', [ownerId]);
  if (!invRes.rows[0]) return 0;
  const res = await db.query(
    'SELECT quantity FROM inventory_items WHERE inventory_id=$1 AND item_id=$2',
    [invRes.rows[0].id, itemId]
  );
  return res.rows[0] ? Number(res.rows[0].quantity) : 0;
}

async function upsertInventoryItem(ownerId, itemId, delta) {
  const invId = await createInventory(ownerId);
  await db.query(
    `INSERT INTO inventory_items (inventory_id, item_id, quantity)
     VALUES ($1, $2, $3)
     ON CONFLICT (inventory_id, item_id)
     DO UPDATE SET quantity = inventory_items.quantity + EXCLUDED.quantity`,
    [invId, itemId, delta]
  );
  await db.query(
    'DELETE FROM inventory_items WHERE inventory_id=$1 AND item_id=$2 AND quantity <= 0',
    [invId, itemId]
  );
}

// legacy alias
const updateInventory = upsertInventoryItem;

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

// --- individual item instance helpers ---
async function addInventoryItem(
  ownerId,
  itemId,
  { instanceId = randomUUID(), durability = null, metadata = {} } = {}
) {
  await db.query(
    `INSERT INTO item_instances (instance_id, owner_id, item_id, durability, metadata)
     VALUES ($1,$2,$3,$4,$5)`,
    [instanceId, ownerId, itemId, durability, metadata]
  );
  return instanceId;
}

async function getInventoryItems(ownerId) {
  const res = await db.query('SELECT * FROM item_instances WHERE owner_id=$1', [ownerId]);
  return res.rows;
}

async function removeInventoryItem(instanceId) {
  await db.query('DELETE FROM item_instances WHERE instance_id=$1', [instanceId]);
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
  getEditingFields,
  setEditingFields,
  findCharacterByNumericID,
  docDelete,
  fieldDelete,
  logData,
  getBalance,
  setBalance,
  getAllBalances,
  createInventory,
  getInventory,
  getInventoryItem,
  upsertInventoryItem,
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
