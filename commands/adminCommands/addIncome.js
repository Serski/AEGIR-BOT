const { SlashCommandBuilder } = require('discord.js');
const admin = require('../../admin');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('addincome')
        .setDescription('Add an income attached to a role')
        .setDefaultMemberPermissions(0)
        .addRoleOption((option) =>
            option.setName('role')
                .setDescription('The role name')
                .setRequired(true)
        )
        .addStringOption((option) =>
            option.setName('income')
                .setDescription('The income value')
                .setRequired(true)
        ),
    async execute(interaction) {
        const role = interaction.options.getRole('role');
        const income = interaction.options.getString('income');

        const reply = await admin.addIncome(role, income);
        await interaction.reply(reply);
    }
  };
