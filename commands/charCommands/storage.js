const { SlashCommandBuilder } = require('discord.js');
const Shop = require('../../Shop'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('storage')
		.setDescription('Show your storage'),
	async execute(interaction) {
        const userID = interaction.user.id;
		var replyEmbed = await Shop.storage(userID);
		await interaction.reply(({ embeds: [replyEmbed] }));
	},
};