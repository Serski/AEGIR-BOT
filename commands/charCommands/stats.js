const { SlashCommandBuilder } = require('discord.js');
const char = require('../../char'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('stats')
		.setDescription('Show player stats'),
	async execute(interaction) {
		const charID = interaction.user.tag;
            let replyEmbed = await char.stats(charID);
            if (typeof(replyEmbed) == 'string') {
                await interaction.reply(replyEmbed);
            } else {
                await interaction.reply({ embeds: [replyEmbed] });
            }
	},
};