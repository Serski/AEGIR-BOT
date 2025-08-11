const dbm = require('./database-manager');

class dataGetters {
    static async getCharFromNumericID(numericID) {
        const idStr = String(numericID);
        const chars = await dbm.loadCollection('characters');

        // Search for numericID (or user_id if you add it later)
        for (const [charKey, data] of Object.entries(chars)) {
            const stored = String(data.numericID || data.user_id || '');
            if (stored === idStr) return charKey;
        }
        return "ERROR";
    }
}

module.exports = dataGetters;
