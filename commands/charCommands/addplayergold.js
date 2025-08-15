const { SlashCommandBuilder } = require('discord.js');
const characters = require('../../db/characters');
const db = require('../../pg-client');
const logger = require('../../logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addplayergold')
        .setDescription('Add gold to a player')
        .addUserOption(option => option.setName('player').setDescription('The player to set the gold of').setRequired(true))
        .addIntegerOption(option => option.setName('gold').setDescription('The amount of gold to set').setRequired(true))
        .setDefaultMemberPermissions(0),
    async execute(interaction) {
        try {
            await characters.ensureAndGetId(interaction.user);
            const targetUser = interaction.options.getUser('player');
            const playerId = await characters.ensureAndGetId(targetUser);
            const gold = interaction.options.getInteger('gold');
            await db.query(
                'INSERT INTO balances (id, amount) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET amount = balances.amount + EXCLUDED.amount',
                [playerId, gold]
            );
            return interaction.reply({ content: `Added ${gold} to ${targetUser}`, ephemeral: true });
        }
        catch (err) {
            logger.error(err.stack);
            return interaction.reply({ content: 'Failed to process your request.', ephemeral: true });
        }
    },
};