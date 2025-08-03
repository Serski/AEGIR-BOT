const { SlashCommandBuilder } = require('discord.js');
const Marketplace = require('../../Marketplace');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sales')
        .setDescription('List sales'),
    async execute(interaction) {
        let [embed, rows] = await Marketplace.createSalesEmbed(1, interaction);
        await interaction.reply({ embeds: [embed], components: rows});
    },
};