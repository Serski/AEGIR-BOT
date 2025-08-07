const db = require('../pg-client');
const { randomUUID } = require('crypto');

async function migrate() {
  await db.query(`CREATE TABLE IF NOT EXISTS items (id TEXT PRIMARY KEY, data JSONB)`);
  await db.query(`CREATE TABLE IF NOT EXISTS inventory_items (
    instance_id TEXT PRIMARY KEY,
    owner_id    TEXT,
    item_id     TEXT,
    durability  INTEGER,
    metadata    JSONB
  )`);

  const res = await db.query('SELECT id, item, qty FROM inventories');
  for (const row of res.rows) {
    const defRes = await db.query('SELECT data FROM items WHERE id=$1', [row.item]);
    const def = defRes.rows[0] ? defRes.rows[0].data : { stackable: true };
    if (def.stackable === false) {
      for (let i = 0; i < Number(row.qty); i++) {
        const instanceId = randomUUID();
        await db.query(
          `INSERT INTO inventory_items (instance_id, owner_id, item_id, durability, metadata)
           VALUES ($1,$2,$3,$4,$5)`,
          [instanceId, row.id, row.item, def.durability || null, {}]
        );
      }
      await db.query('DELETE FROM inventories WHERE id=$1 AND item=$2', [row.id, row.item]);
    }
  }
  console.log('Migration complete');
}

migrate().then(() => db.end()).catch(err => {
  console.error(err);
  db.end();
});
