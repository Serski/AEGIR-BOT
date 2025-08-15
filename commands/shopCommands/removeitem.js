const { SlashCommandBuilder } = require('discord.js');
const shop = require('../../shop');

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
	async execute(interaction) {
		const itemName = interaction.options.getString('itemname');
			let returnString = await shop.removeItem(itemName);

			if (returnString) {
				await interaction.reply(returnString);
			} else {
				await interaction.reply(`Item '${itemName}' has been removed from the shop.`);
			}
			// Call the addItem function from the Shop class
	},
};