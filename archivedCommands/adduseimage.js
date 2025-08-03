const { SlashCommandBuilder } = require('discord.js');
const Char = require('../Char'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('adduseimage')
		.setDescription('Set image to display on use')
		.setDefaultMemberPermissions(0)
		.addStringOption((option) =>
		option.setName('itemname')
			.setDescription('Item to add usage image to')
			.setRequired(true)
		)
		.addStringOption((option) =>
		option.setName('imageurl')
			.setDescription('URL of your image')
			.setRequired(true)
		),
	execute(interaction) {
		const itemName = interaction.options.getString('itemname');
		const avatarURL = interaction.options.getString('imageurl');

		(async () => {
			let replyString = await Char.setAvatar(itemName, avatarURL)
			await interaction.reply(replyString);
		})()
	},
};