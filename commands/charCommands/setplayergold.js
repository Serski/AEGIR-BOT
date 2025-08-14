const { SlashCommandBuilder } = require('discord.js');
const characters = require('../../db/characters');
const db = require('../../pg-client');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setplayergold')
        .setDescription('Sets the gold of a player')
        .addUserOption(option => option.setName('player').setDescription('The player to set the gold of').setRequired(true))
        .addIntegerOption(option => option.setName('gold').setDescription('The amount of gold to set').setRequired(true))
        .setDefaultMemberPermissions(0),
    async execute(interaction) {
        await characters.ensureAndGetId(interaction.user);
        const targetUser = interaction.options.getUser('player');
        const playerId = await characters.ensureAndGetId(targetUser);
        const gold = interaction.options.getInteger('gold');
        await db.query(
            'INSERT INTO balances (id, amount) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET amount = EXCLUDED.amount',
            [playerId, gold]
        );
        return interaction.reply(`Set gold to ${gold} for ${targetUser}`);
    },
};