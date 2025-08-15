const { SlashCommandBuilder } = require('discord.js');
const characters = require('../../db/characters');
const items = require('../../db/items');
const inventory = require('../../db/inventory');

const storageMap = new Map();
const cooldowns = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('store')
        .setDescription('Store an item for later')
        .addStringOption(option => option.setName('item').setDescription('Item to store').setRequired(true))
        .addIntegerOption(option => option.setName('quantity').setDescription('Quantity').setMinValue(1)),
    async execute(interaction) {
        const userId = await characters.ensureAndGetId(interaction.user);
        const itemName = interaction.options.getString('item');
        const qty = interaction.options.getInteger('quantity') ?? 1;

        const now = Date.now();
        const last = cooldowns.get(userId) || 0;
        if (now - last < 3000) {
            return interaction.reply({ content: 'Slow down!', ephemeral: true });
        }
        cooldowns.set(userId, now);

        let itemCode;
        try {
            itemCode = await items.resolveItemCode(itemName);
        } catch (err) {
            return interaction.reply({ content: err.message, ephemeral: true });
        }

        const owned = await inventory.getCount(userId, itemCode);
        if (owned < qty) {
            return interaction.reply({ content: 'You do not have enough of that item.', ephemeral: true });
        }

        await inventory.take(userId, itemCode, qty);
        const userStore = storageMap.get(userId) || {};
        userStore[itemCode] = (userStore[itemCode] || 0) + qty;
        storageMap.set(userId, userStore);

        return interaction.reply(`Stored ${qty} ${itemCode}.`);
    },
    storageMap,
};
