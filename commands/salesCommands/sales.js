const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { listSales } = require('../../db/marketplace');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sales')
        .setDescription('List sales'),
    async execute(interaction) {
        const sales = await listSales();
        const description = sales
            .map(({ name, item_code, price }) => `• ${name} (${item_code}) — ${price ?? 'N/A'} gold`)
            .join('\n');
        const embed = new EmbedBuilder().setDescription(description || 'No sales found.');
        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
