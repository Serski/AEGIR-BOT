const { SlashCommandBuilder } = require('discord.js');
const characters = require('../../db/characters');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('Show character warnings')
    .addUserOption(option => option.setName('player').setDescription('Player to view')),
  async execute(interaction) {
    const target = interaction.options.getUser('player') || interaction.user;
    const charId = await characters.ensureAndGetId(target);
    const data = await characters.load(charId);
    if (!data) {
      return interaction.reply({ content: 'Character not found.', ephemeral: true });
    }
    const warnings = data.warnings || [];
    if (!warnings.length) {
      return interaction.reply({ content: 'No warnings.', ephemeral: true });
    }
    const embed = {
      color: 0x36393e,
      title: `${data.name || target.tag} warnings`,
      description: warnings.map((w, i) => `${i + 1}. ${w}`).join('\n'),
    };
    const ephemeral = target.id === interaction.user.id;
    return interaction.reply({ embeds: [embed], ephemeral });
  },
};
