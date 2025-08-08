const dbm = require('./database-manager');

class dataGetters {
    static async getCharFromNumericID(numericID) {
        const charID = await dbm.findCharacterByNumericID(numericID);
        return charID ?? "ERROR";
    }
}
module.exports = dataGetters;
