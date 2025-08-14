const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('discord.js');
const shop = require('./shop');
const dbm = require('./database-manager');
const dataGetters = require('./dataGetters');
const clientManager = require('./clientManager');
const db = require('./pg-client');
const inventory = require('./db/inventory');

function selectRow() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('panel_select')
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel('Inventory')
          .setValue('inventory')
          .setDescription('View your inventory'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Resources')
          .setValue('resources')
          .setDescription('View stored resources'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Ships')
          .setValue('ships')
          .setDescription('View your ships'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Back')
          .setValue('back')
          .setDescription('Return to main panel')
      )
  );
}

module.exports = {
  mainEmbed: async function (charID) {
    charID = await dataGetters.getCharFromNumericID(charID);
    const charData = await dbm.loadCollection('characters');
    if (charID === 'ERROR' || !charData[charID]) {
      const embed = new EmbedBuilder()
        .setColor(0x36393e)
        .setDescription('Character not found.');
      return [embed, []];
    }
    const balance = await dbm.getBalance(charID);
    const embed = new EmbedBuilder()
      .setColor(0x36393e)
      .setDescription(`Classification accepted.\nBalance: ${clientManager.getEmoji('Gold')} **${balance}**\nAEGIR PANEL SYSTEM`);
    return [embed, [selectRow()]];
  },

  inventoryEmbed: async function (charID, page = 1) {
    charID = await dataGetters.getCharFromNumericID(charID);
    page = Number(page);
    const itemsPerPage = 25;
    const charData = await dbm.loadCollection('characters');
    if (charID === 'ERROR' || !charData[charID]) {
      const embed = new EmbedBuilder()
        .setColor(0x36393e)
        .setDescription('Character not found.');
      return [embed, []];
    }

    const rows = await inventory.getInventoryView(charID);

    const itemIds = [...new Set(rows.map((r) => r.item_id))];
    let iconMap = {};
    if (itemIds.length > 0) {
      const { rows: iconRows } = await db.query(
        `SELECT id, COALESCE(data->>'icon', data->'infoOptions'->>'Icon', '') AS icon
           FROM items
          WHERE id = ANY($1)`,
        [itemIds]
      );
      for (const r of iconRows) {
        iconMap[r.id] = r.icon || '';
      }
    }

    const inventoryMap = {};
    for (const row of rows) {
      const catLower = (row.category || '').toLowerCase();
      if (catLower === 'ships' || catLower === 'ship' || catLower === 'resources' || catLower === 'resource') {
        continue;
      }
      const category = row.category || 'Misc';
      if (!inventoryMap[category]) inventoryMap[category] = [];
      inventoryMap[category].push({
        item: row.name,
        qty: Number(row.quantity),
        icon: iconMap[row.item_id] || '',
      });
    }

    const categories = Object.keys(inventoryMap).sort();
    if (categories.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle('Inventory')
        .setColor(0x36393e)
        .setDescription('No items in inventory!');
      return [embed, [selectRow()]];
    }

    let startIndices = [0];
    let currIndice = 0;
    let currPageLength = 0;
    let i = 0;
    for (const category of categories) {
      const length = inventoryMap[category].length;
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
      let endSpaces = '-';
      if (20 - category.length - 2 > 0) {
        endSpaces = '-'.repeat(20 - category.length - 2);
      }
      descriptionText += `**\`--${category}${endSpaces}\`**\n`;
      descriptionText += inventoryMap[category]
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

    embed.setDescription('**Items:** \n' + descriptionText);
    if (pages > 1) {
      embed.setFooter({ text: `Page ${page} of ${pages}` });
    }

    const rowsArr = [];
    if (pages > 1) {
      const prevButton = new ButtonBuilder()
        .setCustomId('panel_inv_page' + (page - 1))
        .setLabel('<')
        .setStyle(ButtonStyle.Secondary);
      if (page === 1) prevButton.setDisabled(true);

      const nextButton = new ButtonBuilder()
        .setCustomId('panel_inv_page' + (page + 1))
        .setLabel('>')
        .setStyle(ButtonStyle.Secondary);
      if (page === pages) nextButton.setDisabled(true);

      rowsArr.push(new ActionRowBuilder().addComponents(prevButton, nextButton));
    }

    rowsArr.push(selectRow());
    return [embed, rowsArr];
  },

  storageEmbed: async function (charID, page = 1) {
    charID = await dataGetters.getCharFromNumericID(charID);
    page = Number(page);
    const itemsPerPage = 25;
    const charData = await dbm.loadCollection('characters');
    if (charID === 'ERROR' || !charData[charID]) {
      const embed = new EmbedBuilder()
        .setColor(0x36393e)
        .setDescription('Character not found.');
      return [embed, []];
    }

    const rows = await inventory.getInventoryView(charID);
    const resourceRows = rows.filter((r) => r.category === 'Resources');

    const itemIds = [...new Set(resourceRows.map((r) => r.item_id))];
    let iconMap = {};
    if (itemIds.length > 0) {
      const { rows: iconRows } = await db.query(
        `SELECT id, COALESCE(data->>'icon', data->'infoOptions'->>'Icon', '') AS icon
           FROM items
          WHERE id = ANY($1)`,
        [itemIds]
      );
      for (const r of iconRows) {
        iconMap[r.id] = r.icon || '';
      }
    }

    const items = resourceRows
      .map((r) => ({ item: r.name, qty: Number(r.quantity), icon: iconMap[r.item_id] || '' }))
      .sort((a, b) => a.item.localeCompare(b.item));

    const pages = Math.max(1, Math.ceil(items.length / itemsPerPage));
    if (page > pages) page = pages;
    const pageItems = items.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    const embed = new EmbedBuilder().setTitle('Resources').setColor(0x36393e);

    if (pageItems.length === 0) {
      embed.setDescription('No items in Resources!');
      return [embed, [selectRow()]];
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
    if (pages > 1) {
      embed.setFooter({ text: `Page ${page} of ${pages}` });
    }

    const rowsArr = [];
    if (pages > 1) {
      const prevButton = new ButtonBuilder()
        .setCustomId('panel_store_page' + (page - 1))
        .setLabel('<')
        .setStyle(ButtonStyle.Secondary);
      if (page === 1) prevButton.setDisabled(true);

      const nextButton = new ButtonBuilder()
        .setCustomId('panel_store_page' + (page + 1))
        .setLabel('>')
        .setStyle(ButtonStyle.Secondary);
      if (page === pages) nextButton.setDisabled(true);

      rowsArr.push(new ActionRowBuilder().addComponents(prevButton, nextButton));
    }

    rowsArr.push(selectRow());
    return [embed, rowsArr];
  },

  shipsEmbed: async function (charID, page = 1) {
    let [embed, rows] = await shop.createCategoryEmbed(
      charID,
      'Ships',
      page,
      'panel_ship_page',
      'ships'
    );
    rows.push(selectRow());
    return [embed, rows];
  },
};
