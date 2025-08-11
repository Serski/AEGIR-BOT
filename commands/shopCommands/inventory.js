const { SlashCommandBuilder } = require('discord.js');
const shop = require('../../shop'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('inventory')
		.setDescription('Show your inventory'),
	async execute(interaction) {
        const userID = interaction.user.tag;
                const [replyEmbed, rows] = await shop.createInventoryEmbed(userID, 1);
                await interaction.reply({ embeds: [replyEmbed], components: rows });
        },
};
