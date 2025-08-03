const { SlashCommandBuilder } = require('discord.js');
const inventory = require('../../char/inventory'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('bank')
		.setDescription('Show bank'),
	execute(interaction) {
		const charID = interaction.user.tag;

		(async () => {
            let replyEmbed = await inventory.bank(charID);
            if (typeof(replyEmbed) == 'string') {
                await interaction.reply(replyEmbed);
            } else {
                await interaction.reply({ embeds: [replyEmbed] });
            }
		})()
	},
};