const { SlashCommandBuilder } = require('discord.js');
const char = require('../../char'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('me')
		.setDescription('Show player character- only RP aspects'),
	async execute(interaction) {
		const charID = interaction.user.tag;
            let replyEmbed = await char.me(charID);
            if (typeof(replyEmbed) == 'string') {
                await interaction.reply(replyEmbed);
            } else {
                await interaction.reply({ embeds: [replyEmbed] });
            }
	},
};