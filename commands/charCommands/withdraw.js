const { SlashCommandBuilder } = require('discord.js');
const characters = require('../../db/characters');
const db = require('../../pg-client');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('withdraw')
		.setDescription('Withdraw gold from bank')
        .addIntegerOption(option => 
            option.setName('quantity')
                .setDescription('Quantity to withdraw')
                .setRequired(true)),
        async execute(interaction) {
        const charID = await characters.ensureAndGetId(interaction.user);
        const quantity = interaction.options.getInteger('quantity');
            const { rows } = await db.query('SELECT amount FROM bank WHERE id=$1', [charID]);
            const bankAmount = rows[0]?.amount || 0;
            if (bankAmount < quantity) {
                await interaction.reply({ content: "You don't have enough gold!", ephemeral: true });
                return;
            }
            await db.query('UPDATE bank SET amount = amount - $2 WHERE id=$1', [charID, quantity]);
            await db.query(
                'INSERT INTO balances (id, amount) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET amount = balances.amount + EXCLUDED.amount',
                [charID, quantity]
            );
            await interaction.reply({ content: `Withdrew ${quantity} gold from bank`, ephemeral: true });
        },
};