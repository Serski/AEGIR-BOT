const { SlashCommandBuilder } = require('discord.js');
const deployCommands = require('../../deploy-commands');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deploycommands')
    .setDescription('Reload all slash commands')
    .setDefaultMemberPermissions(0),
  async execute(interaction) {
    await deployCommands.loadCommands();
    await interaction.reply('Slash commands deployed.');
  },
};
