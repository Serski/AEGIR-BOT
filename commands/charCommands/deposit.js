const { SlashCommandBuilder } = require('discord.js');
const inventory = require('../../char/inventory'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('deposit')
		.setDescription('Deposit gold to bank')
        .addIntegerOption(option => 
            option.setName('quantity')
                .setDescription('Quantity to deposit')
                .setRequired(true)),
	execute(interaction) {
		const charID = interaction.user.tag;
        const quantity = interaction.options.getInteger('quantity');

		(async () => {
            let replyEmbed = await inventory.deposit(charID, quantity);
            if (typeof(replyEmbed) == 'string') {
                await interaction.reply(replyEmbed);
            } else {
                await interaction.reply("Deposited " + quantity + " gold to bank");
            }
		})()
	},
};