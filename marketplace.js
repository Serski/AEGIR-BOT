const dbm = require('./database-manager');
const shop = require('./shop');
const clientManager = require('./clientManager');
const logger = require('./logger');
const db = require('./pg-client');
const { pool } = require('./pg-client');
const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

async function fetchSales() {
  const { rows } = await pool.query(
    'SELECT id, name, item_code, price, category FROM marketplace_v ORDER BY name'
  );
  return rows;
}
class marketplace {
  /**Function for a player to post a sale.
   * Will take the number of items, the item name, and the price they want to sell it for.
   * Will also be passed their user tag and ID
   * Will load the character.json file and check if they have enough of the item
   * If they do, it will take the items from their inventory and add them to the marketplace under a created unique ID
   * Items will be added to the marketplace according to their item name and category- i.e. all iron swords will be next to each other, and the iron swords will be next to steel swords
   * */ 
  static async postSale(numberItems, itemCode, price, userTag, userID) {
    let charData = await dbm.loadFile('characters', userTag);
    let shopData = await dbm.loadCollection('shop');
    if (!charData) {
      return "Character not found!";
    }
    if (numberItems <= 0) {
      return "You must sell at least one item!";
    }
    if (price < 0) {
      return "Price must be at least 0!";
    }
    // Find the item code using shop.findItemName
    itemCode = await shop.findItemName(itemCode, shopData);
    if (itemCode == "ERROR") {
      return "That item doesn't exist!";
    }

    const meta = await shop.getItemMetadata(itemCode, shopData);
    if (meta?.transferrable === 'No') {
      return "That item is not transferrable!";
    }

    // Check if they have enough of the item
    if (!charData.inventory[itemCode] || charData.inventory[itemCode] < numberItems) {
      return "You don't have enough of that item to sell it!";
    }
    charData.inventory[itemCode] -= numberItems;
    const displayName = meta?.name || itemCode;
    for (let i = 0; i < numberItems; i++) {
      await db.query(
        'INSERT INTO marketplace (name, item_code, price, seller, seller_id) VALUES ($1,$2,$3,$4,$5)',
        [displayName, itemCode, price, userTag, userID]
      );
    }
    await dbm.saveFile('characters', userTag, charData);
    let embed = new EmbedBuilder();
    embed.setDescription(`<@${userID}> listed **${numberItems} ${meta.icon} ${displayName}** to the **/sales** page for ${clientManager.getEmoji("Gold")}**${price}** each.`);
    return embed;
  }

  /**
   * Create a embed list of sales. Will take page number and return embed and action rows
   */
  static async createSalesEmbed(page) {
    const embed = new EmbedBuilder();
    embed.setTitle(clientManager.getEmoji('Gold') + 'Sales');
    embed.setColor(0x36393e);

    const rows = await fetchSales();

    for (const sale of rows) {
      embed.addFields({
        name: sale.name,
        value: `Category: ${sale.category}  •  Price: ${sale.price}  •  ID: \`${sale.item_code}\`  •  Sale: \`${sale.id}\``,
      });
    }

    return [embed, []];
  }
 

  //Create a one page sales embed of just the sales for one player
  static async showSales(player, page) {
    const embed = new EmbedBuilder();
    embed.setTitle(`${player}'s Sales`);
    embed.setColor(0x36393e);

    const { rows } = await pool.query(
      `SELECT id, name, item_code, price, category FROM marketplace_v WHERE seller=$1 ORDER BY name`,
      [player]
    );

    for (const sale of rows) {
      embed.addFields({
        name: sale.name,
        value: `Category: ${sale.category}  •  Price: ${sale.price}  •  ID: \`${sale.item_code}\`  •  Sale: \`${sale.id}\``,
      });
    }

    return embed;
  }

  //Buy a sale. Send the money from the buyer to the seller, and give the buyer the items. If the seller is buying their own sale, merely give them back their items, no need to check their money- this functionality will exist for accidental sales
  static async buySale(saleID, userTag, userID) {
    const charData = await dbm.loadCollection('characters');
    const shopData = await dbm.loadCollection('shop');
    const sale = await marketplace.getSale(saleID);
    if (!sale) {
      return "That sale doesn't exist!";
    }
    if (!charData[userTag] || !charData[sale.seller]) {
      return "Character not found!";
    }
    const price = Number(sale.price ?? 0);
    if (price < 0) {
      return "That sale has invalid data!";
    }
    const itemId = sale.item_code;
    if (sale.seller_id == userID) {
      charData[userTag].inventory[itemId] = (charData[userTag].inventory[itemId] || 0) + 1;
      await db.query('DELETE FROM marketplace WHERE id=$1', [saleID]);
      await dbm.saveCollection('characters', charData);
      let embed = new EmbedBuilder();
      const meta = await shop.getItemMetadata(itemId, shopData);
      embed.setDescription(`<@${userID}> bought **${meta?.icon || ''} ${itemId}** back from themselves. It was listed for ${clientManager.getEmoji("Gold")}**${price}**.`);
      return embed;
    }

    const buyerBalance = await dbm.getBalance(userTag);
    if (buyerBalance < price) {
      return "You don't have enough money to buy that!";
    }
    const sellerBalance = await dbm.getBalance(sale.seller);
    await dbm.setBalance(userTag, buyerBalance - price);
    await dbm.setBalance(sale.seller, sellerBalance + price);

    charData[userTag].inventory[itemId] = (charData[userTag].inventory[itemId] || 0) + 1;
    await db.query('DELETE FROM marketplace WHERE id=$1', [saleID]);
    await dbm.saveCollection('characters', charData);
    let embed = new EmbedBuilder();
    const metaPurchase = await shop.getItemMetadata(itemId, shopData);
    embed.setDescription(`<@${userID}> bought **${metaPurchase?.icon || ''} ${itemId}** from<@${sale.seller_id}> for ${clientManager.getEmoji("Gold")}**${price}**.`);
    return embed;
  }

  //Inspect a sale. Will take the saleID and return an embed with the sale information
  static async inspectSale(saleID) {
    let shopData = await dbm.loadCollection('shop');
    const sale = await marketplace.getSale(saleID);
    if (!sale) {
      return "That sale doesn't exist!";
    }
    const itemId = sale.item_code;
    const price = Number(sale.price ?? 0);
    let embed = new EmbedBuilder();
    embed.setTitle(`Sale ${saleID}`);
    embed.setColor(0x36393e);
    const metaInspect = await shop.getItemMetadata(itemId, shopData);
    embed.setDescription(`**${metaInspect?.icon || ''} ${itemId}** _[${sale.category}]_ for ${clientManager.getEmoji("Gold")}**${price}**.`);
    embed.setFooter({ text: `Seller: ${sale.seller}` });
    return embed;
  }

  static async getSale(saleID) {
    const res = await db.query(
      'SELECT id, name, item_code, price, seller, seller_id, category FROM marketplace_v WHERE id=$1',
      [saleID]
    );
    return res.rows[0];
  }
}

module.exports = marketplace;
