const { SlashCommandBuilder } = require('discord.js');
const { postSale } = require('../../marketplace');
const items = require('../../db/items');
const clientManager = require('../../clientManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sell')
        .setDescription('List an inventory item for sale')
        .addStringOption((option) =>
            option.setName('item')
                .setDescription('Item code or name (codes avoid ambiguity)')
                .setRequired(true)
        )
        .addIntegerOption((option) =>
            option.setName('quantity')
                .setDescription('Quantity of the item (defaults to 1)')
        )
        .addIntegerOption((option) =>
            option.setName('price')
                .setDescription('Price per item (defaults to 0)')
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
