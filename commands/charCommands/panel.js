const { SlashCommandBuilder } = require('discord.js');
const panel = require('../../panel');
const characters = require('../../db/characters');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('panel')
    .setDescription('Open character panel'),
  async execute(interaction) {
    const charId = await characters.ensureAndGetId(interaction.user);
    const [embed, rows] = await panel.mainEmbed(charId);
    await interaction.reply({ embeds: [embed], components: rows, ephemeral: true });
  },
};
