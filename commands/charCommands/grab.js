const { SlashCommandBuilder } = require('discord.js');
const characters = require('../../db/characters');
const items = require('../../db/items');
const inventory = require('../../db/inventory');
const { storageMap } = require('./store');

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

        const userStore = storageMap.get(userId) || {};
        const storedQty = userStore[itemCode] || 0;
        if (storedQty < qty) {
            return interaction.reply({ content: 'Not enough stored items.', ephemeral: true });
        }

        userStore[itemCode] = storedQty - qty;
        storageMap.set(userId, userStore);
        await inventory.give(userId, itemCode, qty);
        return interaction.reply(`Retrieved ${qty} ${itemCode}.`);
    },
};
