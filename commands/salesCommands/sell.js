const { SlashCommandBuilder } = require('discord.js');
const { postSale } = require('../../marketplace');
const items = require('../../db/items');
const clientManager = require('../../clientManager');
const characters = require('../../db/characters');
const logger = require('../../logger');

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
        try {
            const user = interaction.user;
            const charId = await characters.ensureAndGetId(user);

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

            const res = await postSale({ userId: charId, itemCode, price, quantity: qty });

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
        } catch (err) {
            logger.error(err.stack);

            const errorMessages = {
                '23505': 'A sale with these details already exists.',
                '23503': 'This sale references data that does not exist.',
                '23514': 'Sale details violate a database constraint.',
                '23502': 'A required value was missing.',
                '42883': 'A required database function is missing. Please contact an administrator.'
            };

            let userMessage = errorMessages[err.code];

            if (!userMessage) {
                if (/function .* does not exist/i.test(err.message)) {
                    userMessage = 'A required database function is missing. Please contact an administrator.';
                } else if (/violates.*constraint/i.test(err.message)) {
                    userMessage = 'This action violates a database constraint.';
                } else {
                    userMessage = 'Failed to process your request.';
                }
            }

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: userMessage, ephemeral: true });
            } else {
                await interaction.reply({ content: userMessage, ephemeral: true });
            }
        }
    }
};
