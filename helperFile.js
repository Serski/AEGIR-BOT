const dbm = require('./database-manager');
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

async function healthToLegitimacy() {
    const characters = await dbm.loadCollection('characters');

    //in stats map, remove Health option and add Legitimacy option for all characters
    for (let character in characters) {
        character = characters[character];
        character.stats.Legitimacy = character.stats.Health;
        delete character.stats.Health;
    }

    await dbm.saveCollection('characters', characters);
}

//export getResourceEmojis;

async function addShireToShireNames() {
    const kingdoms = await keys.get('kingdoms');

    //Each kingdom has a shires field, which is a map of shire names to shire objects. Shire objects have a name field that should add "shire" to the shire name
    for (let kingdom in kingdoms) {
        kingdom = kingdoms[kingdom];
        for (let shire in kingdom.shires) {
            shire = kingdom.shires[shire];
            shire.name = shire.name + " Shire";
        }
    }

    logger.debug(kingdoms.Jorvik.shires);

    await keys.set('kingdoms', kingdoms);
}

async function addTo10RecipeIngredients() {
    const recipes = await dbm.loadCollection('recipes');

    //For every recipe, in recipeOptions, there should be Ingredient 1 ... Ingredient 5 fields. Add Ingredient 6 ... Ingredient 10 fields. Empty with "" as value
    for (let recipe in recipes) {
        recipe = recipes[recipe];
        recipe.recipeOptions["Ingredient 6"] = "";
        recipe.recipeOptions["Ingredient 7"] = "";
        recipe.recipeOptions["Ingredient 8"] = "";
        recipe.recipeOptions["Ingredient 9"] = "";
        recipe.recipeOptions["Ingredient 10"] = "";
    }

    await dbm.saveCollection('recipes', recipes);
}

async function resetIncomeCD() {
    let collectionName = 'characters';
    let data = await dbm.loadCollection(collectionName);
    //Set date to midnight, february 13
    let now = new Date();
    now = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 0, 0, 0, 0));
    let nextResetTimes = new Map();

    // Define the start date
    let startDate = new Date(0); // Unix epoch start date: January 1, 1970

    for (let [_, charData] of Object.entries(data)) {
      // Always reset the primary incomeAvailable field
      //charData.incomeAvailable = true;
      
      // Reset additional incomeAvailable fields based on their intervals
      for (let key in charData) {
        if (key.startsWith('incomeAvailable') && key !== 'incomeAvailable') {
          let delay = key.replace('incomeAvailable', '');

          if (!nextResetTimes.has(delay)) {
            let delayAmount = parseInt(delay.slice(0, -1));
            let delayUnit = delay.slice(-1);
            let nextCycleTime = new Date(startDate);

            while (nextCycleTime < now) {
                logger.debug(nextCycleTime, now);
                switch (delayUnit) {
                    case 'D':
                        nextCycleTime.setUTCDate(nextCycleTime.getUTCDate() + delayAmount);
                        break;
                    case 'W':
                        nextCycleTime.setUTCDate(nextCycleTime.getUTCDate() + 7 * delayAmount);
                        break;
                    case 'M':
                        nextCycleTime.setUTCMonth(nextCycleTime.getUTCMonth() + delayAmount);
                        break;
                    case 'Y':
                        nextCycleTime.setUTCFullYear(nextCycleTime.getUTCFullYear() + delayAmount);
                        break;
                }
            }

            logger.debug(nextCycleTime);
            logger.debug(nextResetTimes);
            logger.debug(delay);
            logger.debug(nextResetTimes.get(delay));
            logger.debug("Next Cycle Day" + nextCycleTime.getUTCDate() + " Next Cycle Month" + nextCycleTime.getUTCMonth() + " Next Cycle Year" + nextCycleTime.getUTCFullYear());
            logger.debug("Now Day" + now.getUTCDate() + " Now Month" + now.getUTCMonth() + " Now Year" + now.getUTCFullYear());

            nextResetTimes.set(delay, nextCycleTime.getUTCDate() === now.getUTCDate() &&
                                      nextCycleTime.getUTCMonth() === now.getUTCMonth() &&
                                      nextCycleTime.getUTCFullYear() === now.getUTCFullYear());

            logger.debug(nextResetTimes.get(delay));
          }
          if (nextResetTimes.get(delay)) {
            charData[key] = true;
          }
        }
      }
    }
    
    await dbm.saveCollection(collectionName, data);
  }

resetIncomeCD();

// addTo10RecipeIngredients();

module.exports = {
    addNeedNoneOfRolesToShop,
    getResourceEmojis
}
