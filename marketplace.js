const dbm = require('./database-manager');
const shop = require('./shop');
const clientManager = require('./clientManager');
const logger = require('./logger');
const db = require('./pg-client');
const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
class marketplace {
  /**Function for a player to post a sale.
   * Will take the number of items, the item name, and the price they want to sell it for.
   * Will also be passed their user tag and ID
   * Will load the character.json file and check if they have enough of the item
   * If they do, it will take the items from their inventory and add them to the marketplace under a created unique ID
   * Items will be added to the marketplace according to their item name and category- i.e. all iron swords will be next to each other, and the iron swords will be next to steel swords
   * */ 
  static async postSale(numberItems, itemName, price, userTag, userID) {
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
    // Find the item name using shop.findItemName
    itemName = await shop.findItemName(itemName, shopData);
    if (itemName == "ERROR") {
      return "That item doesn't exist!";
    }

    if (shopData[itemName].infoOptions["Transferrable (Y/N)"] == "No") {
      return "That item is not transferrable!";
    }

    // Check if they have enough of the item
    if (!charData.inventory[itemName] || charData.inventory[itemName] < numberItems) {
      return "You don't have enough of that item to sell it!";
    }
    charData.inventory[itemName] -= numberItems;
    const saleData = { item_id: itemName, price, quantity: numberItems };
    const res = await db.query(
      'INSERT INTO marketplace (name, data, seller, seller_id) VALUES ($1,$2,$3,$4) RETURNING id',
      [itemName, saleData, userTag, userID]
    );
    const itemID = res.rows[0].id;
    await dbm.saveFile('characters', userTag, charData);
    let embed = new EmbedBuilder();
    embed.setDescription(`<@${userID}> listed **${numberItems} ${await shop.getItemIcon(itemName, shopData)} ${itemName}** to the **/sales** page for ${clientManager.getEmoji("Gold")}**${price}**.`);
    embed.setFooter({ text: `Sale ID: ${itemID}` });
    return embed;
  }

  /**
   * Create a embed list of sales. Will take page number and return embed and action rows
   */
  static async createSalesEmbed(page) {
    page = Number(page);
    const shopData = await dbm.loadCollection('shop');
    const limit = 25;
    const offset = (page - 1) * limit;
    const { rows } = await db.query(
      "SELECT id, name, item, price, data, data->>'item_id' AS item_id FROM marketplace ORDER BY item, id LIMIT $1 OFFSET $2",
      [limit, offset]
    );
    const countRes = await db.query('SELECT COUNT(*) FROM marketplace');
    const totalPages = Math.max(1, Math.ceil(Number(countRes.rows[0].count) / limit));

    const embed = new EmbedBuilder();
    embed.setTitle(clientManager.getEmoji('Gold') + 'Sales');
    embed.setColor(0x36393e);

    let descriptionText = '';
    for (const sale of rows) {
      const itemId = sale.item_id || sale.item || sale.data?.item_id;
      const quantity = Number(sale.data?.quantity ?? 0);
      const price = Number(sale.price ?? sale.data?.price ?? 0);
      const itemName = sale.name || itemId;
      const icon = await shop.getItemIcon(itemId, shopData);
      let alignSpaces = ' ';
      if (20 - itemName.length - ('' + price + '' + quantity).length > 0) {
        alignSpaces = ' '.repeat(20 - itemName.length - ('' + price + '' + quantity).length);
      }
      descriptionText += `\`${sale.id}\` ${icon} **\`${quantity} ${itemName}${alignSpaces}${price}\`**${clientManager.getEmoji('Gold')}\n`;
    }

    descriptionText += '\n';
    embed.setDescription(descriptionText);

    if (totalPages > 1) {
      embed.setFooter({ text: `/buysale \nPage ${page} of ${totalPages}` });
    } else {
      embed.setFooter({ text: `/buysale` });
    }

    const rowsButtons = [];
    const prevButton = new ButtonBuilder()
      .setCustomId('switch_sale' + (page - 1))
      .setLabel('<')
      .setStyle(ButtonStyle.Secondary);
    if (page === 1) prevButton.setDisabled(true);

    const nextButton = new ButtonBuilder()
      .setCustomId('switch_sale' + (page + 1))
      .setLabel('>')
      .setStyle(ButtonStyle.Secondary);
    if (page === totalPages) nextButton.setDisabled(true);
    rowsButtons.push(new ActionRowBuilder().addComponents(prevButton, nextButton));

    return [embed, rowsButtons];
  }
 

  //Create a one page sales embed of just the sales for one player
  static async showSales(player, page) {
    page = Number(page);
    const shopData = await dbm.loadCollection('shop');
    const limit = 25;
    const offset = (page - 1) * limit;
    const { rows } = await db.query(
      "SELECT id, name, item, price, data, data->>'item_id' AS item_id FROM marketplace WHERE seller=$1 ORDER BY id LIMIT $2 OFFSET $3",
      [player, limit, offset]
    );
    const countRes = await db.query('SELECT COUNT(*) FROM marketplace WHERE seller=$1', [player]);
    const totalPages = Math.max(1, Math.ceil(Number(countRes.rows[0].count) / limit));
    const embed = new EmbedBuilder();
    embed.setTitle(`${player}'s Sales`);
    embed.setColor(0x36393e);
    let descriptionText = '';
    for (const sale of rows) {
      const itemId = sale.item_id || sale.item || sale.data?.item_id;
      const quantity = Number(sale.data?.quantity ?? 0);
      const price = Number(sale.price ?? sale.data?.price ?? 0);
      const itemName = sale.name || itemId;
      const icon = await shop.getItemIcon(itemId, shopData);
      let alignSpaces = ' ';
      if (30 - itemName.length - ('' + price + '' + quantity).length > 0) {
        alignSpaces = ' '.repeat(30 - itemName.length - ('' + price + '' + quantity).length);
      }
      descriptionText += `\`${sale.id}\` ${icon} **\`${quantity} ${itemName}${alignSpaces}${price}\`**${clientManager.getEmoji('Gold')}\n`;
    }
    descriptionText += '\n';
    embed.setDescription(descriptionText);
    embed.setFooter({ text: `Page ${page} of ${totalPages}` });
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
    const quantity = Number(sale.data?.quantity ?? 0);
    const price = Number(sale.price ?? sale.data?.price ?? 0);
    if (quantity < 0 || price < 0) {
      return "That sale has invalid data!";
    }
    const itemId = sale.item_id || sale.item || sale.data?.item_id;
    if (sale.seller_id == userID) {
      if (!charData[userTag].inventory[itemId]) {
        charData[userTag].inventory[itemId] = 0;
      }
      charData[userTag].inventory[itemId] += quantity;
      await db.query('DELETE FROM marketplace WHERE id=$1', [saleID]);
      await dbm.saveCollection('characters', charData);
      let embed = new EmbedBuilder();
      embed.setDescription(`<@${userID}> bought **${quantity} ${await shop.getItemIcon(itemId, shopData)} ${itemId}** back from themselves. It was listed for ${clientManager.getEmoji("Gold")}**${price}**.`);
      return embed;
    }

    const buyerBalance = await dbm.getBalance(userTag);
    if (buyerBalance < price) {
      return "You don't have enough money to buy that!";
    }
    const sellerBalance = await dbm.getBalance(sale.seller);
    await dbm.setBalance(userTag, buyerBalance - price);
    await dbm.setBalance(sale.seller, sellerBalance + price);

    if (!charData[userTag].inventory[itemId]) {
      charData[userTag].inventory[itemId] = 0;
    }

    charData[userTag].inventory[itemId] += quantity;
    await db.query('DELETE FROM marketplace WHERE id=$1', [saleID]);
    await dbm.saveCollection('characters', charData);
    let embed = new EmbedBuilder();
    embed.setDescription(`<@${userID}> bought **${quantity} ${await shop.getItemIcon(itemId, shopData)} ${itemId}** from<@${sale.seller_id}> for ${clientManager.getEmoji("Gold")}**${price}**.`);
    return embed;
  }

  //Inspect a sale. Will take the saleID and return an embed with the sale information
  static async inspectSale(saleID) {
    let shopData = await dbm.loadCollection('shop');
    const sale = await marketplace.getSale(saleID);
    if (!sale) {
      return "That sale doesn't exist!";
    }
    const itemId = sale.item_id || sale.item || sale.data?.item_id;
    const quantity = Number(sale.data?.quantity ?? 0);
    const price = Number(sale.price ?? sale.data?.price ?? 0);
    let embed = new EmbedBuilder();
    embed.setTitle(`Sale ${saleID}`);
    embed.setColor(0x36393e);
    embed.setDescription(`**${quantity} ${await shop.getItemIcon(itemId, shopData)} ${itemId}** for ${clientManager.getEmoji("Gold")}**${price}**.`);
    embed.setFooter({ text: `Seller: ${sale.seller}` });
    return embed;
  }

  static async getSale(saleID) {
    const res = await db.query("SELECT *, data->>'item_id' AS item_id FROM marketplace WHERE id=$1", [saleID]);
    return res.rows[0];
  }
}

module.exports = marketplace;
