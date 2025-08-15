const { SlashCommandBuilder } = require('discord.js');
const characters = require('../../db/characters');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Show character stats')
    .addUserOption(option => option.setName('player').setDescription('Player to view')),
  async execute(interaction) {
    const target = interaction.options.getUser('player') || interaction.user;
    const charId = await characters.ensureAndGetId(target);
    const data = await characters.load(charId);
    if (!data) {
      return interaction.reply({ content: 'Character not found.', ephemeral: true });
    }
    const stats = data.stats || {};
    const fields = Object.entries(stats).map(([name, value]) => ({
      name,
      value: String(value),
      inline: true,
    }));
    const embed = {
      color: 0x36393e,
      title: `${data.name || target.tag} stats`,
      fields,
    };
    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
