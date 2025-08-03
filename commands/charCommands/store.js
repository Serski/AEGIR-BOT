const { SlashCommandBuilder } = require('discord.js');
const Char = require('../../Char'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('store')
		.setDescription('Store an item to storage')
        .addStringOption(option => 
            option.setName('item')
                .setDescription('Item to store')
                .setRequired(true))
        .addIntegerOption(option => 
            option.setName('quantity')
                .setDescription('Quantity to store')
                .setRequired(true)),
	execute(interaction) {
		const charID = interaction.user.tag;
        const item = interaction.options.getString('item');
        const quantity = interaction.options.getInteger('quantity');

		(async () => {
            let replyEmbed = await Char.store(charID, item, quantity);
            if (typeof(replyEmbed) == 'string') {
                await interaction.reply(replyEmbed);
            } else {
                await interaction.reply("Stored " + quantity + " " + item + " to storage");
            }
		})()
	},
};