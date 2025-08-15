const { SlashCommandBuilder } = require('discord.js');
const { inspect } = require('../../shop');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('inspect')
		.setDescription('Inspect an item')
		.addStringOption((option) =>
		option.setName('itemname')
			.setDescription('The item name')
			.setRequired(true)
		),
        async execute(interaction) {
                const itemName = interaction.options.getString('itemname');
            let replyEmbed = await inspect(itemName);
            if (typeof(replyEmbed) == 'string') {
                await interaction.reply({content: replyEmbed, ephemeral: true });
            } else {
                await interaction.reply({ embeds: [replyEmbed] });
            }
        },
};
