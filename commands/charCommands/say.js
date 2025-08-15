const { SlashCommandBuilder } = require('discord.js');
const characters = require('../../db/characters');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Speak as your character')
    .addStringOption(option => option.setName('message').setDescription('Message to send').setRequired(true)),
  async execute(interaction) {
    const charId = await characters.ensureAndGetId(interaction.user);
    const data = await characters.load(charId);
    if (!data) {
      return interaction.reply({ content: 'No character found.', ephemeral: true });
    }
    const message = interaction.options.getString('message');
    const embed = {
      color: 0x36393e,
      author: {
        name: data.name || interaction.user.tag,
        icon_url: data.avatar || interaction.user.displayAvatarURL(),
      },
      description: message,
    };
    return interaction.reply({ embeds: [embed] });
  },
};
