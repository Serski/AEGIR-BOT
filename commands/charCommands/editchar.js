const { SlashCommandBuilder } = require('discord.js');
const characters = require('../../db/characters');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('editchar')
    .setDescription('Edit your character')
    .addStringOption(option => option.setName('name').setDescription('New name'))
    .addStringOption(option => option.setName('bio').setDescription('New biography')),
  async execute(interaction) {
    const charId = await characters.ensureAndGetId(interaction.user);
    const data = await characters.load(charId) || {};
    const name = interaction.options.getString('name');
    const bio = interaction.options.getString('bio');
    if (!name && !bio) {
      return interaction.reply({ content: 'Nothing to update.', ephemeral: true });
    }
    if (name) data.name = name;
    if (bio) data.bio = bio;
    await characters.save(charId, data);
    return interaction.reply({ content: 'Character updated.', ephemeral: true });
  },
};
