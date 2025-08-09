const { SlashCommandBuilder } = require('discord.js');
const shop = require('../../shop');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('shop')
		.setDescription('List shop items'),
        async execute(interaction) {
                const [embed, rows] = await shop.createShopEmbed();
                await interaction.reply({ embeds: [embed], components: rows, ephemeral: true });
        },
};
