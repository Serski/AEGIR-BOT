const dbm = require('./database-manager');

class dataGetters {
  static async getCharFromNumericID(numericID) {
    const chars = await dbm.loadCollection('characters');

    // If caller already passed a character key (e.g., "serski"), accept it.
    if (chars[numericID]) return numericID;

    const idStr = String(numericID);
    for (const [charKey, data] of Object.entries(chars)) {
      const stored = String(data?.numericID || data?.user_id || '');
      if (stored === idStr) return charKey;
    }
    return 'ERROR';
  }
}

module.exports = dataGetters;

