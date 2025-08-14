// db/marketplace.js
const { pool } = require('../pg-client');

async function listSales({ sellerId, limit, offset, cursor } = {}) {
  const conditions = [];
  const params = [];
  if (sellerId) {
    params.push(sellerId);
    conditions.push(`seller = $${params.length}`);
  }
  if (cursor) {
    params.push(cursor);
    conditions.push(`id > $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  let sql = `
    SELECT id, name, item_id, price, quantity, seller
    FROM marketplace_v
    ${where}
    ORDER BY ${cursor ? 'id' : 'name NULLS LAST'}
  `;
  if (limit !== undefined) {
    params.push(limit);
    sql += ` LIMIT $${params.length}`;
  }
  if (offset !== undefined) {
    params.push(offset);
    sql += ` OFFSET $${params.length}`;
  }
  const { rows } = await pool.query(sql, params);
  let totalCount;
  if (limit !== undefined || offset !== undefined) {
    const countSql = `SELECT COUNT(*) FROM marketplace_v ${where}`;
    const countParams = params.slice(0, conditions.length);
    const countRes = await pool.query(countSql, countParams);
    totalCount = Number(countRes.rows[0].count);
  }
  return { rows, totalCount };
}

module.exports = { listSales };
