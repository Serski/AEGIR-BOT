const pool = require('../pg-client');

function asTag(user) {
  return (user.tag || `${user.username}${user.discriminator ? '#' + user.discriminator : ''}`).toLowerCase();
}

exports.ensureAndGetId = async (user) => {
  const numeric = String(user.id);
  const uname   = user.username.toLowerCase();
  const tag     = asTag(user);

  const find = await pool.query(
    `SELECT id
       FROM characters
      WHERE lower(id) IN ($1,$2)
         OR data->>'numeric_id' = $3
      LIMIT 1`,
    [uname, tag, numeric]
  );
  if (find.rows.length) return find.rows[0].id;

  const data = {
    tag: (user.tag || null),
    numeric_id: numeric,
    created_at: new Date().toISOString()
  };
  await pool.query(
    `INSERT INTO characters (id, data) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
    [uname, JSON.stringify(data)]
  );
  return uname;
};
