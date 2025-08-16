const { SlashCommandBuilder } = require('discord.js');
const shop = require('../../shop');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('removeitem')
    .setDescription('Delete an item. This is destructive and cannot be undone.')
    .setDefaultMemberPermissions(0)
    .addStringOption(option =>
      option.setName('itemname')
        .setDescription('The item name')
        .setRequired(true)
    ),
  async execute(interaction) {
    const itemName = interaction.options.getString('itemname');
    const removed = await shop.removeItem(itemName);

    if (removed === 0) {
      await interaction.reply(`Item '${itemName}' was not found in the shop.`);
    } else {
      await interaction.reply(`Item '${itemName}' has been removed from the shop.`);
    }
  },
};
