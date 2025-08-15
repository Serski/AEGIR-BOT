const { SlashCommandBuilder } = require('discord.js');
const admin = require('../../admin'); // Importing the database manager
const logger = require('../../logger');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('addplayerkingoms')
        .setDescription('Add a player kingdom to the list of kingdoms.')
        .addRoleOption(option => 
            option.setName('kingdom')
                .setDescription('The name of the kingdom to add.')
                .setRequired(true))
        .setDefaultMemberPermissions(0),
	async execute(interaction) {
		try {
            const kingdom = interaction.options.getRole('kingdom');
            const reply = await admin.addKingdom(kingdom);
            await interaction.reply({ content: reply, ephemeral: true });
        } catch (error) {
            logger.error("Failed to add map menu:", error);
            await interaction.reply({ content: "Failed to add the kingdom. Please try again.", ephemeral: true });
        }
	},
};
