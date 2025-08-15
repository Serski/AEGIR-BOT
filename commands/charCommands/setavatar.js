const { SlashCommandBuilder } = require('discord.js');
const characters = require('../../db/characters');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setavatar')
    .setDescription('Set your character avatar')
    .addStringOption(option => option.setName('url').setDescription('Image URL').setRequired(true)),
  async execute(interaction) {
    const charId = await characters.ensureAndGetId(interaction.user);
    const data = await characters.load(charId) || {};
    const url = interaction.options.getString('url');
    data.avatar = url;
    await characters.save(charId, data);
    return interaction.reply({ content: 'Avatar updated.', ephemeral: true });
  },
};
