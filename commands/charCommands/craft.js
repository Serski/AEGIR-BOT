const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const characters = require('../../db/characters');
const items = require('../../db/items');
const inventory = require('../../db/inventory');

const RECIPES = {
    potion: { herb: 2, water: 1 },
};

const cooldowns = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('craft')
        .setDescription('Craft an item from resources')
        .addStringOption(option => option.setName('item').setDescription('Item to craft').setRequired(true))
        .addIntegerOption(option => option.setName('quantity').setDescription('Quantity').setMinValue(1)),
    async execute(interaction) {
        const userId = await characters.ensureAndGetId(interaction.user);
        const itemName = interaction.options.getString('item');
        const qty = interaction.options.getInteger('quantity') ?? 1;

        const now = Date.now();
        const last = cooldowns.get(userId) || 0;
        if (now - last < 3000) {
            return interaction.reply({ content: 'You are crafting too fast.', ephemeral: true });
        }
        cooldowns.set(userId, now);

        let itemCode;
        try {
            itemCode = await items.resolveItemCode(itemName);
        } catch (err) {
            return interaction.reply({ content: err.message, ephemeral: true });
        }

        const recipe = RECIPES[itemCode];
        if (!recipe) {
            return interaction.reply({ content: 'No crafting recipe for that item.', ephemeral: true });
        }

        for (const [component, amount] of Object.entries(recipe)) {
            const compCode = await items.resolveItemCode(component);
            const owned = await inventory.getCount(userId, compCode);
            if (owned < amount * qty) {
                return interaction.reply({ content: `You need ${amount * qty} ${component} to craft ${qty}.`, ephemeral: true });
            }
        }

        for (const [component, amount] of Object.entries(recipe)) {
            const compCode = await items.resolveItemCode(component);
            await inventory.take(userId, compCode, amount * qty);
        }

        await inventory.give(userId, itemCode, qty);
        const embed = new EmbedBuilder().setDescription(`Crafted ${qty} ${itemCode}!`);
        return interaction.reply({ embeds: [embed] });
    },
    RECIPES,
};
