const dbm = require('./database-manager');

class DataGetters {
    static async getCharFromNumericID(numericID) {
        let collectionName = 'characters';
        let data = await dbm.loadCollection(collectionName);
        for (let [charID, charData] of Object.entries(data)) {
            //console.log(charData.numericID);
            //console.log(parseInt(numericID));
            if (parseInt(charData.numericID) === parseInt(numericID)) {
                return charID;
            }
        }
        return "ERROR";
    }
}
module.exports = DataGetters;
