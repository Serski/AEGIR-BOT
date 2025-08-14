const { SlashCommandBuilder } = require('discord.js');
const char = require('../../char'); // Importing the database manager
const characters = require('../../db/characters');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('charadmin')
		.setDescription('Show any player character')
		.setDefaultMemberPermissions(0)
		.addUserOption((option) =>
			option.setName('character')
				.setDescription('The character to check')
				.setRequired(true)
		),
        async execute(interaction) {
                const target = interaction.options.getUser('character');
                const charID = await characters.ensureAndGetId(target);
            let replyEmbed = await char.char(charID);
            if (typeof(replyEmbed) == 'string') {
                await interaction.reply(replyEmbed);
            } else {
                await interaction.reply({ embeds: [replyEmbed] });
            }
        },
};