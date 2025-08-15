const { SlashCommandBuilder } = require('discord.js');
const characters = require('../../db/characters');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('me')
    .setDescription('Show your character information'),
  async execute(interaction) {
    const charId = await characters.ensureAndGetId(interaction.user);
    const data = await characters.load(charId);
    if (!data) {
      return interaction.reply({ content: 'You do not have a character yet.', ephemeral: true });
    }
    const embed = {
      color: 0x36393e,
      title: data.name || interaction.user.tag,
      description: data.bio || 'No biography set.',
    };
    if (data.avatar) embed.thumbnail = { url: data.avatar };
    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
