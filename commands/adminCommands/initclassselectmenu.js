const { SlashCommandBuilder } = require('discord.js');
const admin = require('../../admin'); // Importing the database manager
const logger = require('../../logger');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('initclassselectmenu')
		.setDescription('Initialize a class select menu here')
		.setDefaultMemberPermissions(0),
	async execute(interaction) {
		try {
            // Call the method with the channel object directly
            await admin.initClassSelect(interaction.channel);
            await interaction.reply({ content: "Set! Select menu should appear just below this message", ephemeral: true });
        } catch (error) {
            logger.error("Failed to initialize select menu:", error);
            await interaction.reply({ content: "Failed to set the select menu. Please try again.", ephemeral: true });
        }
	},
};
