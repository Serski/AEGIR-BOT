const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Placeholder module for the Razathaar quest.
// Provides a start button labeled "CALLING ALL LIGHT-FREIGHT CAPTAINS".
// Further quest logic will be implemented later.
module.exports = {
  createStartButton() {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('start_razathaarQuest')
        .setLabel('CALLING ALL LIGHT-FREIGHT CAPTAINS')
        .setStyle(ButtonStyle.Primary)
    );
  },

  async execute(interaction) {
    // TODO: Implement the Razathaar quest logic here.
    await interaction.reply({
      content: 'Razathaar quest coming soon!',
      ephemeral: true,
    });
  },
};
