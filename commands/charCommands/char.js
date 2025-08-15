const { SlashCommandBuilder } = require('discord.js');
const characters = require('../../db/characters');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('char')
    .setDescription('Show character information')
    .addUserOption(option => option.setName('player').setDescription('Player to inspect')),
  async execute(interaction) {
    const target = interaction.options.getUser('player') || interaction.user;
    const charId = await characters.ensureAndGetId(target);
    const data = await characters.load(charId);
    if (!data) {
      return interaction.reply({ content: 'Character not found.', ephemeral: true });
    }
    const embed = {
      color: 0x36393e,
      title: data.name || target.tag || target.username,
      description: data.bio || 'No biography set.',
    };
    if (data.avatar) embed.thumbnail = { url: data.avatar };
    return interaction.reply({ embeds: [embed] });
  },
};
