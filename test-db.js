const db = require('./postgres');

db.query('SELECT NOW()')
  .then(res => {
    console.log('✅ Connected! Current time:', res.rows[0]);
    db.end();
  })
  .catch(err => {
    console.error('❌ Connection failed:', err);
  });
