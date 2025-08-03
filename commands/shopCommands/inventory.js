const { SlashCommandBuilder } = require('discord.js');
const Shop = require('../../Shop'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('inventory')
		.setDescription('Show your inventory'),
	async execute(interaction) {
        const userID = interaction.user.id;
		var replyEmbed = await Shop.createInventoryEmbed(userID);
		await interaction.reply(({ embeds: [replyEmbed] }));
	},
};