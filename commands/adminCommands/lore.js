const { SlashCommandBuilder } = require('discord.js');
const admin = require('../../admin');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('lore')
		.setDescription('Show a lore.')
		.addStringOption((option) =>
		option.setName('lore')
			.setDescription('The lore name')
			.setRequired(true)
		),
	async execute(interaction) {
		const loreName = interaction.options.getString('lore');
            let returnEmbed = await admin.map(loreName, interaction.channelId, "lore");

			// If the return is a string, it's an error message
            if (typeof(returnEmbed) == 'string') {
                // If it's a string, it's an error message, ephemeral it
                await interaction.reply({content: returnEmbed, ephemeral: true });
            } else {
                await interaction.reply({ embeds: [returnEmbed] });
            }
			// Call the addItem function from the Shop class
	},
};