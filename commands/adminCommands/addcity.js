const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addcity')
    .setDescription('Add a city'),
  async execute(interaction) {
    return interaction.reply({ content: 'Temporarily disabled.', ephemeral: true });
  }
};

