const { SlashCommandBuilder } = require('discord.js');
const characters = require('../../db/characters');
const items = require('../../db/items');
const inventory = require('../../db/inventory');

const cooldowns = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('useitem')
        .setDescription('Use an item from your inventory')
        .addStringOption(option => option.setName('item').setDescription('Item to use').setRequired(true)),
    async execute(interaction) {
        const userId = await characters.ensureAndGetId(interaction.user);
        const itemName = interaction.options.getString('item');

        const now = Date.now();
        const last = cooldowns.get(userId) || 0;
        if (now - last < 3000) {
            return interaction.reply({ content: 'You are using items too quickly.', ephemeral: true });
        }
        cooldowns.set(userId, now);

        let itemCode;
        try {
            itemCode = await items.resolveItemCode(itemName);
        } catch (err) {
            return interaction.reply({ content: err.message, ephemeral: true });
        }

        const owned = await inventory.getCount(userId, itemCode);
        if (owned < 1) {
            return interaction.reply({ content: 'You do not own that item.', ephemeral: true });
        }

        await inventory.take(userId, itemCode, 1);
        return interaction.reply(`Used one ${itemCode}.`);
    },
};
