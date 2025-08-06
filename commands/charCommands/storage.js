const { SlashCommandBuilder } = require('discord.js');
const shop = require('../../shop'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('storage')
		.setDescription('Show your storage'),
	async execute(interaction) {
        const userID = interaction.user.id;
                const [replyEmbed, rows] = await shop.storage(userID, 1);
                await interaction.reply({ embeds: [replyEmbed], components: rows });
        },
};