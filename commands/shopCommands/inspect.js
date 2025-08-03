const { SlashCommandBuilder } = require('discord.js');
const Shop = require('../../Shop'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('inspect')
		.setDescription('Inspect an item')
		.addStringOption((option) =>
		option.setName('itemname')
			.setDescription('The item name')
			.setRequired(true)
		),
	execute(interaction) {
		const itemName = interaction.options.getString('itemname');

		(async () => {
            let replyEmbed = await Shop.inspect(itemName);
            if (typeof(replyEmbed) == 'string') {
                await interaction.reply({content: replyEmbed, ephemeral: true });
            } else {
                await interaction.reply({ embeds: [replyEmbed] });
            }
		})()
	},
};