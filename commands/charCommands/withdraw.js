const { SlashCommandBuilder } = require('discord.js');
const characters = require('../../db/characters');
const db = require('../../pg-client');
const dbm = require('../../database-manager');

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
            const charData = await dbm.loadFile('characters', charID);
            if (!charData) {
                return interaction.reply("You haven't made a character! Use /newchar first");
            }
            if ((charData.bank || 0) < quantity) {
                return interaction.reply("You don't have enough gold!");
            }
            await db.query(
                'INSERT INTO balances (id, amount) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET amount = balances.amount + EXCLUDED.amount',
                [charID, quantity]
            );
            charData.bank -= quantity;
            await dbm.saveFile('characters', charID, charData);
            await interaction.reply("Withdrew " + quantity + " gold from bank");
        },
};