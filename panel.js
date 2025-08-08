const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('discord.js');
const shop = require('./shop');
const char = require('./char');
const dbm = require('./database-manager');
const dataGetters = require('./dataGetters');
const clientManager = require('./clientManager');

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
    const balance = charData[charID].balance || 0;
    const embed = new EmbedBuilder()
      .setColor(0x36393e)
      .setDescription(`Classification accepted.\nBalance: ${clientManager.getEmoji('Gold')} **${balance}**\nAEGIR PANEL SYSTEM`);
    return [embed, [selectRow()]];
  },

  inventoryEmbed: async function (charID, page = 1) {
    let [embed, rows] = await shop.createInventoryEmbed(charID, page);
    rows.push(selectRow());
    return [embed, rows];
  },

  storageEmbed: async function (charID, page = 1) {
    let [embed, rows] = await shop.storage(charID, page);
    rows.push(selectRow());
    return [embed, rows];
  },

  shipsEmbed: async function (charID, page = 1) {
    charID = await dataGetters.getCharFromNumericID(charID);
    const charData = await dbm.loadCollection('characters');
    if (charID === 'ERROR' || !charData[charID]) {
      const embed = new EmbedBuilder()
        .setColor(0x36393e)
        .setDescription('Character not found.');
      return [embed, []];
    }
    const ships = await char.getShips(charID);
    const shopData = await dbm.loadCollection('shop');
    const itemsPerPage = 25;
    const lines = [];
    for (const [shipName, cargo] of Object.entries(ships)) {
      lines.push(`**${shipName}**`);
      if (cargo && Object.keys(cargo).length > 0) {
        for (const item of Object.keys(cargo)) {
          const icon = shopData[item]?.infoOptions.Icon || '';
          const qty = cargo[item];
          lines.push(`${icon} \`${item} ${qty}\``);
        }
      } else {
        lines.push('`Empty`');
      }
    }
    const pages = Math.max(1, Math.ceil(lines.length / itemsPerPage));
    if (page > pages) page = pages;
    const pageLines = lines.slice((page - 1) * itemsPerPage, page * itemsPerPage);
    const embed = new EmbedBuilder()
      .setTitle('Ships')
      .setColor(0x36393e)
      .setDescription(pageLines.length ? pageLines.join('\n') : 'No ships!');
    if (pages > 1) {
      embed.setFooter({ text: `Page ${page} of ${pages}` });
    }
    const rows = [];
    if (pages > 1) {
      const prevButton = new ButtonBuilder()
        .setCustomId('panel_ship_page' + (page - 1))
        .setLabel('<')
        .setStyle(ButtonStyle.Secondary);
      if (page === 1) {
        prevButton.setDisabled(true);
      }
      const nextButton = new ButtonBuilder()
        .setCustomId('panel_ship_page' + (page + 1))
        .setLabel('>')
        .setStyle(ButtonStyle.Secondary);
      if (page === pages) {
        nextButton.setDisabled(true);
      }
      rows.push(new ActionRowBuilder().addComponents(prevButton, nextButton));
    }
    rows.push(selectRow());
    return [embed, rows];
  },
};
