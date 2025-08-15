const { SlashCommandBuilder } = require('discord.js');
const characters = require('../../db/characters');
const items = require('../../db/items');
const inventory = require('../../db/inventory');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveitem')
        .setDescription('Give an item to a player')
        .addUserOption(option => option.setName('player').setDescription('Player to receive the item').setRequired(true))
        .addStringOption(option => option.setName('item').setDescription('Item code or name').setRequired(true))
        .addIntegerOption(option => option.setName('quantity').setDescription('Quantity').setMinValue(1)),
    async execute(interaction) {
        const target = interaction.options.getUser('player');
        const itemName = interaction.options.getString('item');
        const qty = interaction.options.getInteger('quantity') ?? 1;

        let itemCode;
        try {
            itemCode = await items.resolveItemCode(itemName);
        } catch (err) {
            return interaction.reply({ content: err.message, ephemeral: true });
        }

        const receiverId = await characters.ensureAndGetId(target);
        await inventory.give(receiverId, itemCode, qty);
        return interaction.reply(`Gave ${qty} ${itemCode} to ${target}`);
    },
};
