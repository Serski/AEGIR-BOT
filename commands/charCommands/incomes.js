const { SlashCommandBuilder } = require('discord.js');
const char = require('../../char');
const characters = require('../../db/characters');
const logger = require('../../logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('incomes')
        .setDescription('Collect your daily incomes'),
    async execute(interaction) {
        try {
            const charID = await characters.ensureAndGetId(interaction.user);
            const [replyEmbed, replyString] = await char.incomes(charID);
            await interaction.reply({ embeds: [replyEmbed] });
            if (replyString) {
                await interaction.channel.send(replyString);
            }
        } catch (error) {
            logger.error('Failed to collect incomes', error);
            const content = 'An error occurred while collecting incomes. Please try again later.';
            if (interaction.deferred || interaction.replied) {
                await interaction.followUp({ content, ephemeral: true });
            } else {
                await interaction.reply({ content, ephemeral: true });
            }
        }
    },
};
