const { SlashCommandBuilder } = require('discord.js');
const incomes = require('../../db/incomes');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removeincome')
        .setDescription('Delete an income. This is destructive and cannot be undone.')
        .setDefaultMemberPermissions(0)
        .addStringOption((option) =>
        option.setName('income')
            .setDescription('The income name')
            .setRequired(true)
        ),
    async execute(interaction) {
        const incomeName = interaction.options.getString('income');

        await incomes.remove(incomeName);
        await interaction.reply(`Income '${incomeName}' has been removed.`);
    },
  };
