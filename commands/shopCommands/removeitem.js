const { SlashCommandBuilder } = require('discord.js');
const Shop = require('../../Shop'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('removeitem')
		.setDescription('Delete an item. This is destructive and cannot be undone.')
		.setDefaultMemberPermissions(0)
		.addStringOption((option) =>
		option.setName('itemname')
			.setDescription('The item name')
			.setRequired(true)
		),
	execute(interaction) {
		const itemName = interaction.options.getString('itemname');

		(async () => {
			let returnString = await Shop.removeItem(itemName);

			if (returnString) {
				await interaction.reply(returnString);
			} else {
				await interaction.reply(`Item '${itemName}' has been removed from the Shop.`);
			}
			// Call the addItem function from the Shop class
		})()
	},
};