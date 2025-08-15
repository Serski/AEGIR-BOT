const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const characters = require('../../db/characters');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('newchar')
    .setDescription('Create a new character'),
  async execute(interaction) {
    await characters.ensureAndGetId(interaction.user);
    const modal = new ModalBuilder()
      .setCustomId('newcharmodal')
      .setTitle('Create Character');

    const nameInput = new TextInputBuilder()
      .setCustomId('charname')
      .setLabel('Name')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const bioInput = new TextInputBuilder()
      .setCustomId('charbio')
      .setLabel('Bio')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(nameInput),
      new ActionRowBuilder().addComponents(bioInput),
    );

    return interaction.showModal(modal);
  },
};
