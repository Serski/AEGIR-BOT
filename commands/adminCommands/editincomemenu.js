const { SlashCommandBuilder } = require('discord.js');
const admin = require('../../admin');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('editincomemenu')
        .setDescription('Edit an income')
        .setDefaultMemberPermissions(0)
        .addStringOption((option) =>
            option.setName('income')
                .setDescription('The income to edit')
                .setRequired(true)
        ),
    async execute(interaction) {
        const income = interaction.options.getString('income');
        const reply = await admin.editIncomeMenu(income, interaction.user.tag);
        if (typeof reply === 'string') {
            await interaction.reply(reply);
        } else {
            await interaction.reply({ embeds: [reply] });
        }
    }
};
