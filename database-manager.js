// database-manager.js  –  SIMPLE FILE STORAGE VERSION
const fs   = require('node:fs');
const path = require('node:path');

const storageDir = path.join(__dirname, 'jsonStorage');
if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir);

// helper to write whole collection
function saveCollection(collectionName, data) {
  const fp = path.join(storageDir, `${collectionName}.json`);
  return fs.promises
    .writeFile(fp, JSON.stringify(data, null, 2))
    .then(() => console.log(`Collection "${collectionName}" saved (file).`));
}

// helper to read whole collection (returns {} if missing)
async function loadCollection(collectionName) {
  const fp = path.join(storageDir, `${collectionName}.json`);
  try {
    const txt = await fs.promises.readFile(fp, 'utf8');
    return JSON.parse(txt);
  } catch {
    return {};
  }
}

async function saveFile(collection, doc, data) {
  const coll = await loadCollection(collection);
  coll[doc] = data;
  return saveCollection(collection, coll);
}

async function loadFile(collection, doc) {
  const coll = await loadCollection(collection);
  return coll[doc];
}

async function docDelete(collection, doc) {
  const coll = await loadCollection(collection);
  delete coll[doc];
  return saveCollection(collection, coll);
}

async function logData() {
  // no‑op for the file backend
  console.log('[database-manager] logData skipped (file backend).');
}

module.exports = {
  saveCollection,
  loadCollection,
  saveFile,
  loadFile,
  docDelete,
  logData,
};
