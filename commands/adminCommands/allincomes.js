const { SlashCommandBuilder } = require('discord.js');
const admin = require('../../admin');
const logger = require('../../logger');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('allincomes')
		.setDescription('List all incomes')
		.setDefaultMemberPermissions(0),
	async execute(interaction) {
        await interaction.deferReply();
                try {
            const reply = await admin.allIncomes(1);
            if (typeof reply === 'string') {
                await interaction.editReply(reply);
            } else {
                const [embed, rows] = reply;
                await interaction.editReply({ embeds: [embed], components: rows });
            }
        } catch (error) {
            logger.error("Failed to get incomes", error);
            await interaction.editReply({ content: "An error was caught. Contact Alex.", ephemeral: true });
        }
        },
};

