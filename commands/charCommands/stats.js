const { SlashCommandBuilder } = require('discord.js');
const Char = require('../../Char'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('stats')
		.setDescription('Show player stats'),
	execute(interaction) {
		const charID = interaction.user.tag;

		(async () => {
            let replyEmbed = await Char.stats(charID);
            if (typeof(replyEmbed) == 'string') {
                await interaction.reply(replyEmbed);
            } else {
                await interaction.reply({ embeds: [replyEmbed] });
            }
		})()
	},
};