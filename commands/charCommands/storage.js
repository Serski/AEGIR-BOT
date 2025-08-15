const { SlashCommandBuilder } = require('discord.js');
const shop = require('../../shop');
const characters = require('../../db/characters');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('storage')
		.setDescription('Show your storage'),
        async execute(interaction) {
        const userID = await characters.ensureAndGetId(interaction.user);
                const [replyEmbed, rows] = await shop.storage(userID, 1);
                await interaction.reply({ embeds: [replyEmbed], components: rows });
        },
};