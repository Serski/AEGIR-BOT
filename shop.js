console.log('[shop.js] removeItem: matching by item/id/name');
const db = require('./pg-client');
const Discord = require('discord.js');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const logger = require('./logger');
const items = require('./db/items');
const inventoryModule = require('./db/inventory');

async function fetchShopItems() {
  const { rows } = await db.query(
    `SELECT id,
            data->>'item' AS name,
            data->>'item_id' AS item_id,
            (data->>'price')::numeric AS price,
            data->'infoOptions'->>'Category' AS category
       FROM shop
      ORDER BY name`
  );
  return rows;
}

class shop {
  static async findItemName(itemName) {
    const res = await db.query(
      `SELECT data->>'item' AS name
         FROM shop
        WHERE LOWER(data->>'item') = LOWER($1)
           OR LOWER(data->>'item_id') = LOWER($1)
        ORDER BY name`,
      [itemName]
    );
    return res.rows[0] ? res.rows[0].name : 'ERROR';
  }

  // accepts either an item code, row id, or display name
  static async removeItem(code) {
    code = String(code).trim();

    const { rowCount } = await db.query(
      `DELETE FROM shop
         WHERE data->>'item_id' = $1
            OR data->>'item'    = $1
            OR id               = $1`,
      [code]
    );
    return rowCount;
  }

  static async inspect(itemName) {
    let itemCode;
    try {
      itemCode = await items.resolveItemCode(itemName);
    } catch (err) {
      return err.message;
    }

    const { rows } = await db.query(
      `SELECT data->>'item' AS name,
              data->>'item_id' AS item_id,
              (data->>'price')::numeric AS price,
              data->'infoOptions'->>'Category' AS category,
              data->'infoOptions'->>'Description' AS description,
              COALESCE(data->>'icon', data->'infoOptions'->>'Icon') AS icon
         FROM shop
        WHERE data->>'item_id' = $1`,
      [itemCode]
    );

    let info = rows[0];
    if (!info) {
      const { rows: itemRows } = await db.query(
        `SELECT id AS item_id,
                data->>'name' AS name,
                NULL::numeric AS price,
                data->>'category' AS category,
                data->>'description' AS description,
                COALESCE(data->>'icon', data->'infoOptions'->>'Icon') AS icon
           FROM items
          WHERE id = $1`,
        [itemCode]
      );
      info = itemRows[0];
    }

    if (!info) return 'Item not found';

    const embed = new EmbedBuilder()
      .setTitle(info.name)
      .setColor(0x36393e);

    if (info.description) embed.setDescription(info.description);
    if (info.icon) embed.setThumbnail(info.icon);

    embed.addFields(
      { name: 'Item Code', value: info.item_id, inline: true },
      { name: 'Category', value: info.category || 'Unknown', inline: true }
    );

    if (info.price !== null && info.price !== undefined) {
      embed.addFields({ name: 'Price', value: String(info.price), inline: true });
    }

    return embed;
  }

  static async createShopEmbed() {
    const embed = new EmbedBuilder()
      .setTitle('**Galactic Bazaar**')
      .setColor(0x2c3e50);

    const items = await fetchShopItems();
    const categories = {};
    for (const row of items) {
      const price = Number(row.price);
      if (!price || Number.isNaN(price)) continue;
      const category = row.category ?? 'Other';
      if (!categories[category]) categories[category] = [];
      categories[category].push({ name: row.name, price, item_id: row.item_id });
    }

    for (const [category, list] of Object.entries(categories)) {
      const value = list.map(it => `${it.name}`).join('\n');
      embed.addFields({ name: category, value });
    }

    return [embed];
  }

  static async createAllItemsEmbed(page) {
    page = Number(page);
    const itemsPerPage = 25;

    const { rows } = await db.query(
      `SELECT id,
              data->>'item' AS name,
              data->>'item_id' AS item_id,
              (data->>'price')::numeric AS price,
              data->'infoOptions'->>'Category' AS category
         FROM shop
        ORDER BY name`
    );

    let itemCategories = {};
    for (const row of rows) {
      const priceVal = row.price;
      if (priceVal === '' || priceVal === undefined || priceVal === null) continue;
      if (Number.isNaN(Number(priceVal))) continue;
      const category = row.category ?? 'Other';
      if (!itemCategories[category]) itemCategories[category] = [];
      const itemName = row.name;
      const icon = '';
      itemCategories[category].push({ name: itemName, icon });
    }

    const sortedCategories = Object.keys(itemCategories).sort().reduce((acc, key) => {
      acc[key] = itemCategories[key];
      return acc;
    }, {});

    const categories = Object.keys(sortedCategories);
    const pages = Math.max(1, Math.ceil(categories.length / itemsPerPage));
    if (page > pages) page = pages;
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageCategories = categories.slice(start, end);

    const embed = new EmbedBuilder()
      .setTitle('All Items')
      .setColor(0x36393e);

    for (const category of pageCategories) {
      const value = sortedCategories[category]
        .map(({ name, icon }) => `${icon} ${name}`)
        .join('\n');
      embed.addFields({ name: category, value });
    }

    const totalPages = Math.max(1, Math.ceil(categories.length / itemsPerPage));
    embed.setFooter({ text: `Page ${page} of ${totalPages}` });

    const prevButton = new ButtonBuilder()
      .setCustomId('allitems_page' + (page - 1))
      .setLabel('<')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 1);

    const nextButton = new ButtonBuilder()
      .setCustomId('allitems_page' + (page + 1))
      .setLabel('>')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === totalPages);

    const actionRow = new ActionRowBuilder().addComponents(prevButton, nextButton);
    return [embed, actionRow];
  }

  static async createCategoryEmbed(charID, category, page = 1, idPrefix = 'panel_cat_page') {
    page = Number(page);
    const itemsPerPage = 25;

    if (charID === 'ERROR') {
      const embed = new EmbedBuilder()
        .setColor(0x36393e)
        .setDescription('Character not found.');
      return [embed, []];
    }

    const { rows } = await db.query(
      `SELECT character_id, item_id, quantity, name, category
         FROM v_inventory
        WHERE character_id = $1 AND category = $2
        ORDER BY name`,
      [charID, category]
    );

    const items = rows.map(r => ({ item: r.name, qty: Number(r.quantity), icon: '' }));
    const pages = Math.max(1, Math.ceil(items.length / itemsPerPage));
    if (page > pages) page = pages;
    const pageItems = items.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    const embed = new EmbedBuilder()
      .setTitle(category)
      .setColor(0x36393e);

    if (pageItems.length === 0) {
      embed.setDescription('No items in ' + category + '!');
      return [embed, []];
    }

    const descriptionText = pageItems
      .map(({ item, qty, icon }) => {
        let alignSpaces = ' ';
        if (30 - item.length - ('' + qty).length > 0) {
          alignSpaces = ' '.repeat(30 - item.length - ('' + qty).length);
        }
        return `${icon} \`${item}${alignSpaces}${qty}\``;
      })
      .join('\n');

    embed.setDescription('**Items:** \n' + descriptionText);
    if (pages > 1) embed.setFooter({ text: `Page ${page} of ${pages}` });

    const rowsArr = [];
    if (pages > 1) {
      const prevButton = new ButtonBuilder()
        .setCustomId(idPrefix + (page - 1))
        .setLabel('<')
        .setStyle(ButtonStyle.Secondary);
      if (page === 1) prevButton.setDisabled(true);

      const nextButton = new ButtonBuilder()
        .setCustomId(idPrefix + (page + 1))
        .setLabel('>')
        .setStyle(ButtonStyle.Secondary);
      if (page === pages) nextButton.setDisabled(true);

      rowsArr.push(new ActionRowBuilder().addComponents(prevButton, nextButton));
    }

    return [embed, rowsArr];
  }

  static async createInventoryEmbed(charID, page = 1) {
    page = Number(page);
    const itemsPerPage = 25;

    if (charID === 'ERROR') {
      const embed = new EmbedBuilder()
        .setColor(0x36393e)
        .setDescription('Character not found.');
      return [embed, []];
    }

    const { rows } = await db.query(
      `SELECT character_id, item_id, quantity, name, category
         FROM v_inventory
        WHERE character_id = $1
        ORDER BY category, name`,
      [charID]
    );

    const inventory = {};
    for (const row of rows) {
      const catLower = (row.category || '').toLowerCase();
      if (catLower === 'ships' || catLower === 'ship' || catLower === 'resources' || catLower === 'resource') continue;
      const category = row.category || 'Misc';
      if (!inventory[category]) inventory[category] = [];
      inventory[category].push({ item: row.name, qty: Number(row.quantity), icon: '' });
    }

    const categories = Object.keys(inventory).sort();
    if (categories.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle('Inventory')
        .setColor(0x36393e)
        .setDescription('No items in inventory!');
      return [embed, []];
    }

    let startIndices = [0];
    let currIndice = 0;
    let currPageLength = 0;
    let i = 0;
    for (const category of categories) {
      const length = inventory[category].length;
      currPageLength += length;
      if (currPageLength > itemsPerPage) {
        currPageLength = length;
        currIndice++;
        startIndices[currIndice] = i;
      }
      i++;
    }

    const pages = Math.max(1, Math.ceil(startIndices.length));
    if (page > pages) page = pages;
    const pageItems = categories.slice(
      startIndices[page - 1],
      startIndices[page] !== undefined ? startIndices[page] : undefined
    );

    const embed = new EmbedBuilder().setTitle('Inventory').setColor(0x36393e);

    let descriptionText = '';
    for (const category of pageItems) {
      descriptionText += `**${category}**\n`;
      descriptionText += inventory[category]
        .map(({ item, qty, icon }) => {
          let alignSpaces = ' ';
          if (30 - item.length - ('' + qty).length > 0) {
            alignSpaces = ' '.repeat(30 - item.length - ('' + qty).length);
          }
          return `${icon} \`${item}${alignSpaces}${qty}\``;
        })
        .join('\n');
      descriptionText += '\n';
    }
    embed.setDescription(descriptionText);

    if (pages > 1) embed.setFooter({ text: `Page ${page} of ${pages}` });

    const row = [];
    if (pages > 1) {
      const prevButton = new ButtonBuilder()
        .setCustomId('inventory_prev' + (page - 1))
        .setLabel('<')
        .setStyle(ButtonStyle.Secondary);
      if (page === 1) prevButton.setDisabled(true);

      const nextButton = new ButtonBuilder()
        .setCustomId('inventory_prev' + (page + 1))
        .setLabel('>')
        .setStyle(ButtonStyle.Secondary);
      if (page === pages) nextButton.setDisabled(true);

      row.push(new ActionRowBuilder().addComponents(prevButton, nextButton));
    }

    return [embed, row];
  }

  static async storage(charID, page = 1) {
    return this.createCategoryEmbed(charID, 'Resources', page, 'panel_store_page', 'storage');
  }

  static async getItemPrice(itemName) {
    const res = await db.query(
      `SELECT id,
              data->>'item' AS name,
              data->>'item_id' AS item_id,
              (data->>'price')::numeric AS price,
              data->'infoOptions'->>'Category' AS category
         FROM shop
        WHERE LOWER(data->>'item') = LOWER($1)
           OR LOWER(data->>'item_id') = LOWER($1)
        ORDER BY name`,
      [itemName]
    );
    if (!res.rows[0]) {
      return 'ERROR';
    }
    const row = res.rows[0];
    const priceVal = row.price;
    return priceVal === '' || priceVal === undefined || priceVal === null
      ? 'No Price Item!'
      : priceVal;
  }

  static async getItemCategory(itemName) {
    const res = await db.query(
      `SELECT id,
              data->>'item' AS name,
              data->>'item_id' AS item_id,
              (data->>'price')::numeric AS price,
              data->'infoOptions'->>'Category' AS category
         FROM shop
        WHERE LOWER(data->>'item') = LOWER($1)
           OR LOWER(data->>'item_id') = LOWER($1)
        ORDER BY name`,
      [itemName]
    );
    if (!res.rows[0]) {
      return 'ERROR';
    }
    return res.rows[0].category ?? 'Other';
  }

  static async getItemIcon(itemName) {
    const res = await db.query(
      `SELECT data->'infoOptions'->>'Icon' AS icon
         FROM shop
        WHERE LOWER(data->>'item') = LOWER($1)
           OR LOWER(data->>'item_id') = LOWER($1)
        ORDER BY data->>'item'`,
      [itemName]
    );
    if (!res.rows[0]) {
      return 'ERROR';
    }
    return res.rows[0].icon || '';
  }

  static async getItemMetadata(itemId) {
    const res = await db.query(
      `SELECT id,
              data->>'item' AS name,
              data->>'item_id' AS item_id,
              (data->>'price')::numeric AS price,
              data->'infoOptions'->>'Category' AS category,
              data->'infoOptions'->>'Icon' AS icon
         FROM shop
        WHERE LOWER(data->>'item') = LOWER($1)
           OR LOWER(data->>'item_id') = LOWER($1)
        ORDER BY data->>'item'`,
      [itemId]
    );
    if (!res.rows[0]) return null;
    const row = res.rows[0];
    return {
      name: row.name,
      icon: row.icon || '',
      category: row.category ?? 'Other',
      transferrable: '',
      usage: {},
      data: {},
    };
  }

  static async buyItem(shopKey, charID, numToBuy, channelId) {
    const meta = await items.getItemMetaByCode(shopKey);
    if (!meta) {
      return 'Item not found!';
    }
    const { rows } = await db.query(
      `SELECT id,
              data->>'item' AS name,
              data->>'item_id' AS item_id,
              (data->>'price')::numeric AS price,
              data->'infoOptions'->>'Category' AS category
         FROM shop
        WHERE data->>'item_id' = $1`,
      [meta.item_id]
    );
    if (!rows[0]) {
      return 'Item not found!';
    }
    const row = rows[0];
    const price = Number(row.price);
    if (!price || !(price > 0)) {
      return 'Not a valid item to purchase!';
    }

    const { rows: balRows } = await db.query(
      'SELECT amount FROM balances WHERE id=$1',
      [charID]
    );
    const currentBalance = balRows[0]?.amount || 0;
    const totalCost = price * numToBuy;
    if (currentBalance < totalCost) {
      return 'You do not have enough gold!';
    }

    const itemId = meta.item_id;
    try {
      await inventoryModule.getCount(charID, itemId);
    } catch (err) {
      logger.error(err);
    }

    await db.tx(async t => {
      await t.query(
        'INSERT INTO balances (id, amount) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING',
        [charID, currentBalance]
      );
      await t.query(
        'UPDATE balances SET amount = amount - $1 WHERE id = $2',
        [totalCost, charID]
      );
      const crypto = require('crypto');
      for (let i = 0; i < numToBuy; i++) {
        const iid = crypto.randomUUID();
        await t.query(
          `INSERT INTO inventory_items (instance_id, owner_id, item_id, durability, metadata)
           VALUES ($1, $2, $3, NULL, '{}'::jsonb)`,
          [iid, charID, itemId]
        );
      }
    });

    const itemName = meta.name || row.name;
    return 'Succesfully bought ' + numToBuy + ' ' + itemName;
  }
}

module.exports = shop;
