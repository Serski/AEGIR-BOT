const keys = require('./db/keys');
const clientManager = require('./clientManager');
const logger = require('./logger');
const db = require('./pg-client');

// Iterate through all items in the database and append the "Need None Of Roles" field
// to each record's usageOptions. This is a one-time script to backfill the field.
// Usage: node addNeedNoneOfRolesToShop.js
async function addNeedNoneOfRolesToShop() {
    // Load all items from the database
    const { rows } = await db.query('SELECT id, data FROM items');

    // Add the "Need None Of Roles" field to each item's usageOptions and update
    for (const row of rows) {
        const data = row.data || {};
        if (!data.usageOptions) data.usageOptions = {};
        data.usageOptions["Need None Of Roles"] = "";
        await db.query('UPDATE items SET data = $2 WHERE id = $1', [row.id, data]);
    }
}

async function getResourceEmojis() {
    const resources = await keys.get('resources');
    
    for (let resource in resources) {
        let emoji = clientManager.getEmoji(resource);
        if (!emoji || emoji == null) {
            logger.warn(`Resource ${resource} does not have an emoji`);
            continue;
        }
        resources[resource].emoji = emoji;
    }

    await keys.set('resources', resources);
}
module.exports = {
    addNeedNoneOfRolesToShop,
    getResourceEmojis
}
