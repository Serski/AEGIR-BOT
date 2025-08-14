//Admin command

const { SlashCommandBuilder } = require('discord.js');
const characters = require('../../db/characters');
const db = require('../../pg-client');
const clientManager = require('../../clientManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('transfergold')
        .setDescription('Transfer gold from a player to a player')
        .setDefaultMemberPermissions(0)
        .addUserOption(option => option.setName('playergiving').setDescription('The player giving gold').setRequired(true))
        .addUserOption(option => option.setName('playergetting').setDescription('The player to give gold to').setRequired(true))
        .addIntegerOption(option => option.setName('amount').setDescription('The amount of gold to give').setRequired(true)),
    async execute(interaction) {
        await characters.ensureAndGetId(interaction.user);
        const givingUser = interaction.options.getUser('playergiving');
        const fromId = await characters.ensureAndGetId(givingUser);
        const gettingUser = interaction.options.getUser('playergetting');
        const toId = await characters.ensureAndGetId(gettingUser);
        const amount = interaction.options.getInteger('amount');
        if (fromId === toId) {
            return interaction.reply("You can't give gold to yourself!");
        }
        if (amount < 1) {
            return interaction.reply('Amount must be greater than 0');
        }
        const { rows } = await db.query('SELECT amount FROM balances WHERE id=$1', [fromId]);
        const balance = rows[0]?.amount || 0;
        if (balance < amount) {
            return interaction.reply("You don't have enough gold!");
        }
        await db.query('UPDATE balances SET amount = amount - $2 WHERE id=$1', [fromId, amount]);
        await db.query(
            'INSERT INTO balances (id, amount) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET amount = balances.amount + EXCLUDED.amount',
            [toId, amount]
        );
        return interaction.reply(`Gave ${clientManager.getEmoji("Gold")} ${amount} to ${gettingUser}`);
    },
};