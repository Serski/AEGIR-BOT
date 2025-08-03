const { SlashCommandBuilder } = require('discord.js');
const Shop = require('../../Shop'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('inventoryadmin')
		.setDescription('Show the inventory of a user')
		.setDefaultMemberPermissions(0)
		.addUserOption((option) =>
			option.setName('user')
				.setDescription('The user to check inventory of')
				.setRequired(true)
		),
	async execute(interaction) {
        const userID = interaction.options.getUser('user').id;
		var replyEmbed = await Shop.createInventoryEmbed(userID);
		await interaction.reply(({ embeds: [replyEmbed] }));
	},
};