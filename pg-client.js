const { Pool } = require('pg');
const logger = require('./logger');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not defined');
}

const poolConfig = { connectionString };
if (process.env.PGPOOL_MAX) poolConfig.max = Number(process.env.PGPOOL_MAX);
if (process.env.PGPOOL_MIN) poolConfig.min = Number(process.env.PGPOOL_MIN);
if (process.env.PGPOOL_IDLE) poolConfig.idleTimeoutMillis = Number(process.env.PGPOOL_IDLE);
if (process.env.PGPOOL_CLIENT_TIMEOUT) poolConfig.connectionTimeoutMillis = Number(process.env.PGPOOL_CLIENT_TIMEOUT);

const pool = new Pool(poolConfig);
logger.info(`[pg-client] pool created (max=${pool.options.max || 10})`);

module.exports = {
  query: (text, params) => pool.query(text, params),
  tx: async (cb) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await cb({
        query: (text, params) => client.query(text, params),
      });
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
  pool,
};

