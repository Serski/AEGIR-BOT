//Passes saleID to inspectSale function in marketplace.js

const { SlashCommandBuilder } = require('@discordjs/builders');
const { showSales } = require('../../marketplace');
const characters = require('../../db/characters');
const logger = require('../../logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('showsales')
        .setDescription('Show a players sales')
        .addUserOption((option) =>
            option.setName('player')
                .setDescription('Player to show sales for')
                .setRequired(false)
        )
        .addIntegerOption((option) =>
            option.setName('page')
                .setDescription('Page number')
                .setRequired(false)
        ),
    async execute(interaction) {
        try {
            const player = interaction.options.getUser('player') ?? interaction.user;
            const page = interaction.options.getInteger('page') ?? 1;
            const playerId = await characters.ensureAndGetId(player);
            const res = await showSales(playerId, page);
            if (typeof res === 'string') {
                await interaction.reply(res);
            } else {
                await interaction.reply({ embeds: [res] });
            }
        } catch (error) {
            logger.error('Failed to show sales:', error);
            await interaction.reply({ content: 'Failed to show sales. Please try again.', ephemeral: true });
        }
    },
};
