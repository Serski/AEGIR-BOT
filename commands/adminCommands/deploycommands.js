const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deploycommands')
    .setDescription('Reload all slash commands')
    .setDefaultMemberPermissions(0),
  async execute(interaction) {
    const deployCommands = require('../../deploy-commands');
    await deployCommands.loadCommands();
    await interaction.reply('Slash commands deployed.');
  },
};
