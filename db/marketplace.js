// db/marketplace.js
const { pool } = require('../pg-client');

async function listSales() {
  const sql = `
    SELECT id,
           COALESCE(NULLIF(data->>'name',''), id) AS name,
           NULLIF(data->>'item_id','')           AS item_id,
           NULLIF(data->>'price','')::int        AS price,
           data
    FROM marketplace
    ORDER BY name NULLS LAST
  `;
  const { rows } = await pool.query(sql);
  return rows;
}
module.exports = { listSales };
