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
    let [embed, rows] = await shop.createInventoryEmbed(charID, page);
    rows.push(selectRow());
    return [embed, rows];
  },

  storageEmbed: async function (charID, page = 1) {
    charID = await dataGetters.getCharFromNumericID(charID);
    const charData = await dbm.loadCollection('characters');
    if (charID === 'ERROR' || !charData[charID]) {
      const embed = new EmbedBuilder()
        .setColor(0x36393e)
        .setDescription('Character not found.');
      return [embed, []];
    }
    let [embed, rows] = await shop.createCategoryEmbed(charID, 'Resources', page, 'panel_store_page', 'storage');
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
    let [embed, rows] = await shop.createCategoryEmbed(charID, 'Ships', page, 'panel_ship_page', 'ships');
    rows.push(selectRow());
    return [embed, rows];
  },
};
