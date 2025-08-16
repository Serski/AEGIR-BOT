const { SlashCommandBuilder } = require('discord.js');
const characters = require('../../db/characters');
const items = require('../../db/items');
const inventory = require('../../db/inventory');
const storage = require('../../db/storage');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('grab')
        .setDescription('Retrieve an item from storage')
        .addStringOption(option => option.setName('item').setDescription('Item to retrieve').setRequired(true))
        .addIntegerOption(option => option.setName('quantity').setDescription('Quantity').setMinValue(1)),
    async execute(interaction) {
        const userId = await characters.ensureAndGetId(interaction.user);
        const itemName = interaction.options.getString('item');
        const qty = interaction.options.getInteger('quantity') ?? 1;

        let itemCode;
        try {
            itemCode = await items.resolveItemCode(itemName);
        } catch (err) {
            return interaction.reply({ content: err.message, ephemeral: true });
        }

        const storedQty = await storage.get(userId, itemCode);
        if (storedQty < qty) {
            return interaction.reply({ content: 'Not enough stored items.', ephemeral: true });
        }

        await storage.retrieve(userId, itemCode, qty);
        await inventory.give(userId, itemCode, qty);
        return interaction.reply(`Retrieved ${qty} ${itemCode}.`);
    },
};
