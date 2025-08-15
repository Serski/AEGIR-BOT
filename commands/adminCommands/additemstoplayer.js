// Admin command

const { SlashCommandBuilder } = require('discord.js');
const characters = require('../../db/characters');
const items = require('../../db/items');
const inventory = require('../../db/inventory');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('additemstoplayer')
        .setDescription('Adds items to a player')
        .setDefaultMemberPermissions(0)
        .addUserOption(option => option.setName('player').setDescription('The player to add items to').setRequired(true))
        .addStringOption(option => option.setName('item').setDescription('The item to add').setRequired(true))
        .addIntegerOption(option => option.setName('quantity').setDescription('The amount of items to add').setRequired(false)),
    async execute(interaction) {
        try {
            const player = interaction.options.getUser('player');
            const item = interaction.options.getString('item');
            const qty = interaction.options.getInteger('quantity') ?? 1;

            const charId = await characters.ensureAndGetId(player);
            const itemCode = await items.resolveItemCode(item);
            await inventory.give(charId, itemCode, qty);

            return interaction.reply({ content: `Gave ${qty} ${item} to <@${player.id}>`, ephemeral: true });
        }
        catch (err) {
            console.error(err.stack);
            return interaction.reply({ content: 'Failed to process your request.', ephemeral: true });
        }
    },
};
