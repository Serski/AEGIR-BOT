const db = require('./pg-client');

class dataGetters {
  static async getCharFromNumericID(numericID) {
    const idStr = String(numericID);

    const direct = await db.query('SELECT id FROM characters WHERE id = $1', [idStr]);
    if (direct.rows[0]) return idStr;

    const res = await db.query(
      "SELECT id FROM characters WHERE data->>'numeric_id' = $1",
      [idStr]
    );
    return res.rows[0]?.id || 'ERROR';
  }
}

module.exports = dataGetters;

