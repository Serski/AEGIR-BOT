const { SlashCommandBuilder } = require('discord.js');
const char = require('../../char'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('balance')
		.setDescription('Show balance'),
	async execute(interaction) {
		const charID = interaction.user.tag;
            let replyEmbed = await char.balance(charID);
            if (typeof(replyEmbed) == 'string') {
                await interaction.reply(replyEmbed);
            } else {
                await interaction.reply({ embeds: [replyEmbed] });
            }
	},
};