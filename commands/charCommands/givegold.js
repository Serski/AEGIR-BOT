//Admin command

const { SlashCommandBuilder } = require('discord.js');
const characters = require('../../db/characters');
const db = require('../../pg-client');
const clientManager = require('../../clientManager');
const logger = require('../../logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('givegold')
        .setDescription('Give gold to a player')
        .addUserOption(option => option.setName('player').setDescription('The player to give gold to').setRequired(true))
        .addIntegerOption(option => option.setName('amount').setDescription('The amount of gold to give').setRequired(true)),
    async execute(interaction) {
        try {
            const giverId = await characters.ensureAndGetId(interaction.user);
            const targetUser = interaction.options.getUser('player');
            const receiverId = await characters.ensureAndGetId(targetUser);
            const amount = interaction.options.getInteger('amount');
            if (giverId === receiverId) {
                return interaction.reply("You can't give gold to yourself!");
            }
            if (amount < 1) {
                return interaction.reply('Amount must be greater than 0');
            }
            const { rows } = await db.query('SELECT amount FROM balances WHERE id=$1', [giverId]);
            const balance = rows[0]?.amount || 0;
            if (balance < amount) {
                return interaction.reply("You don't have enough gold!");
            }
            await db.query('UPDATE balances SET amount = amount - $2 WHERE id=$1', [giverId, amount]);
            await db.query(
                'INSERT INTO balances (id, amount) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET amount = balances.amount + EXCLUDED.amount',
                [receiverId, amount]
            );
            return interaction.reply(`Gave ${clientManager.getEmoji("Gold")} ${amount} to ${targetUser}`);
        }
        catch (err) {
            logger.error(err.stack);
            return interaction.reply({ content: 'Failed to process your request.', ephemeral: true });
        }
    },
};