const { SlashCommandBuilder } = require('discord.js');
const panel = require('../../panel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('panel')
    .setDescription('Open character panel'),
  async execute(interaction) {
    const [embed, rows] = await panel.mainEmbed(interaction.user.id);
    await interaction.reply({ embeds: [embed], components: rows, ephemeral: true });
  },
};
