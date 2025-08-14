const { SlashCommandBuilder } = require('discord.js');
const shop = require('../../shop'); // Importing the database manager
const characters = require('../../db/characters');

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
        const user = interaction.options.getUser('user');
        const userID = await characters.ensureAndGetId(user);
                const [replyEmbed, rows] = await shop.createInventoryEmbed(userID, 1);
                await interaction.reply({ embeds: [replyEmbed], components: rows });
        },
};
