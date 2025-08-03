const { SlashCommandBuilder } = require('discord.js');
const Shop = require('../../Shop'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('shop')
		.setDescription('List shop items'),
	async execute(interaction) {
		// const itemListString = await Shop.shop();
		// console.log("DATA");
		// console.log(itemListString);
		// await interaction.reply(itemListString);
		await interaction.deferReply();
		let [embed, rows] = await Shop.createShopEmbed(1, interaction);
		await interaction.editReply({ embeds: [embed], components: rows});
	},
};
