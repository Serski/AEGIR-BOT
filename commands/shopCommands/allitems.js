const { SlashCommandBuilder } = require('discord.js');
const Shop = require('../../Shop'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('allitems')
		.setDefaultMemberPermissions(0)
		.setDescription('List all items'),
	async execute(interaction) {
		// const itemListString = await Shop.shop();
		// console.log("DATA");
		// console.log(itemListString);
		// await interaction.reply(itemListString);
		let [embed, rows] = await Shop.createAllItemsEmbed(1, interaction);
		console.log(rows);
		await interaction.reply({ embeds: [embed], components: rows});
	},
};