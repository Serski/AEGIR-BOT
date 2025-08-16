const { SlashCommandBuilder } = require('discord.js');
const admin = require('../../admin');
const logger = require('../../logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('listplayerkingdoms')
        .setDescription('List all kingdoms owned by a player')
        .setDefaultMemberPermissions(0),
    async execute(interaction) {
        try {
            const kingdoms = await admin.listKingdoms();
            if (typeof kingdoms === 'string') {
                await interaction.reply({ content: kingdoms, ephemeral: true });
                return;
            }
            await interaction.reply({ embeds: [kingdoms] });
        } catch (error) {
            logger.error("Failed to get player kingdoms", error);
            await interaction.reply({ content: "An error was caught. Contact Alex.", ephemeral: true });
        }
    }
};
