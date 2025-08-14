const { SlashCommandBuilder } = require('discord.js');
const characters = require('../../db/characters');
const db = require('../../pg-client');
const dbm = require('../../database-manager');

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
            const charData = await dbm.loadFile('characters', charID);
            if (!charData) {
                return interaction.reply("You haven't made a character! Use /newchar first");
            }
            const { rows } = await db.query('SELECT amount FROM balances WHERE id=$1', [charID]);
            const balance = rows[0]?.amount || 0;
            if (balance < quantity) {
                return interaction.reply("You don't have enough gold!");
            }
            await db.query('UPDATE balances SET amount = amount - $2 WHERE id=$1', [charID, quantity]);
            charData.bank = (charData.bank || 0) + quantity;
            await dbm.saveFile('characters', charID, charData);
            await interaction.reply("Deposited " + quantity + " gold to bank");
        },
};