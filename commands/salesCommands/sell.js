const { SlashCommandBuilder } = require('discord.js');
const { postSale } = require('../../marketplace');
const items = require('../../db/items');
const clientManager = require('../../clientManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sell')
        .setDescription('Sell an item (use item codes to avoid ambiguity)')
        .addStringOption((option) =>
            option.setName('item')
                .setDescription('The item code (names may be ambiguous)')
                .setRequired(true)
        )
        .addIntegerOption((option) =>
            option.setName('quantity')
                .setDescription('The quantity of the item')
        )
        .addIntegerOption((option) =>
            option.setName('price')
                .setDescription('The price of the item')
        ),
    async execute(interaction) {
        const userId = interaction.user.id;
        const rawItem = interaction.options.getString('item');
        const price = interaction.options.getInteger('price') ?? 0;
        const qty = interaction.options.getInteger('quantity') ?? 1;

        let itemCode;
        try {
            itemCode = await items.resolveItemCode(rawItem);
        } catch (err) {
            await interaction.reply({ content: `Could not resolve \"${rawItem}\": ${err.message}`, ephemeral: true });
            return;
        }

        const res = await postSale({ userId, rawItem: itemCode, price, quantity: qty });

        if (!res.ok) {
            if (res.reason === 'not_enough') {
                await interaction.reply({ content: `You have ${res.owned} but need ${res.needed}.`, ephemeral: true });
            } else {
                await interaction.reply({ content: 'Failed to list that sale.', ephemeral: true });
            }
            return;
        }

        const emoji = clientManager.getEmoji('Gold') ?? '';
        await interaction.reply(`Listed ${qty} × ${res.itemCode} for ${emoji}${price} each on the marketplace.`);
    }
};
