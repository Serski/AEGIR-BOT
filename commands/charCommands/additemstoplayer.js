//Admin command

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const char = require('../../char'); // Importing the database manager

module.exports = {
    data: new SlashCommandBuilder()
        .setName('additemstoplayer')
        .setDescription('Adds items to a player')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(option => option.setName('player').setDescription('The player to add items to').setRequired(true))
        .addStringOption(option => option.setName('item').setDescription('The item to add').setRequired(true))
        .addIntegerOption(option => option.setName('amount').setDescription('The amount of items to add').setRequired(true)),
    async execute(interaction) {
        const player = interaction.options.getUser('player').toString();
        const item = interaction.options.getString('item');
        const amount = interaction.options.getInteger('amount');
        try {
            const canonical = await char.addItemToPlayer(player, item, amount);
            return interaction.reply(`Gave ${amount} ${canonical} to ${player}`);
        } catch (err) {
            return interaction.reply(err.message || 'Something went wrong');
        }
    },
};
