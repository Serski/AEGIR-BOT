const { SlashCommandBuilder } = require('discord.js');
const Shop = require('../Shop'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('removeusecase')
		.setDescription('Remove use case from item')
		.setDefaultMemberPermissions(0)
		.addStringOption((option) =>
		option.setName('itemname')
			.setDescription('The item name')
			.setRequired(true)
		),
	execute(interaction) {
		const itemName = interaction.options.getString('itemname');

		(async () => {
			reply = await Shop.removeUseCase(itemName);
            await interaction.reply(reply);
		})()
	},
};