const { SlashCommandBuilder } = require('discord.js');
const characters = require('../../db/characters');
const db = require('../../pg-client');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('deposit')
		.setDescription('Deposit gold to bank')
        .addIntegerOption(option => 
            option.setName('quantity')
                .setDescription('Quantity to deposit')
                .setRequired(true)),
        async execute(interaction) {
        const charID = await characters.ensureAndGetId(interaction.user);
        const quantity = interaction.options.getInteger('quantity');
            const { rows } = await db.query('SELECT amount FROM balances WHERE id=$1', [charID]);
            const balance = rows[0]?.amount || 0;
            if (balance < quantity) {
                await interaction.reply({ content: "You don't have enough gold!", ephemeral: true });
                return;
            }
            await db.query('UPDATE balances SET amount = amount - $2 WHERE id=$1', [charID, quantity]);
            await db.query("INSERT INTO bank (id, amount) VALUES ($1,$2) ON CONFLICT (id) DO UPDATE SET amount = bank.amount + EXCLUDED.amount", [charID, quantity]);
            await interaction.reply({ content: `Deposited ${quantity} gold to bank`, ephemeral: true });
        },
};