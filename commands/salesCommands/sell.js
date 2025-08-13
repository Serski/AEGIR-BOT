const { SlashCommandBuilder } = require('discord.js');
const marketplace = require('../../marketplace');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sell')
        .setDescription('Sell an item')
        .addStringOption((option) =>
            option.setName('item')
                .setDescription('The item code or name')
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

        const res = await marketplace.postSale({ userId, rawItem, price, quantity: qty });

        if (!res.ok) {
            if (res.reason === 'not_enough') {
                await interaction.reply({ content: `You have ${res.owned} but need ${res.needed}.`, ephemeral: true });
            } else {
                await interaction.reply({ content: 'Failed to list that sale.', ephemeral: true });
            }
            return;
        }

        await interaction.reply(`Listed ${qty} × ${res.itemCode} for ${price} each on the marketplace.`);
    }
};
