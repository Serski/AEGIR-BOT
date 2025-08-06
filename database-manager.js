const db = require('./pg-client');
const logger = require('./logger');

const tables = ['characters', 'keys', 'shop', 'recipes', 'marketplace', 'shoplayout'];

function assertTable(name) {
  if (!tables.includes(name)) throw new Error(`Unknown table ${name}`);
  return name;
}

async function init() {
  for (const t of tables) {
    await db.query(`CREATE TABLE IF NOT EXISTS ${t} (id TEXT PRIMARY KEY, data JSONB)`);
  }
  logger.debug('[database-manager] tables ensured.');
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

module.exports = {
  saveCollection,
  loadCollection,
  loadCollectionFileNames,
  saveFile,
  loadFile,
  docDelete,
  fieldDelete,
  logData,
};
