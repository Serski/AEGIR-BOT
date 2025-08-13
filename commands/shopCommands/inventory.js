const { SlashCommandBuilder } = require('discord.js');
const { getInventoryView } = require('../../db/inventory');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('inventory')
		.setDescription('Show your inventory'),
	async execute(interaction) {
        const rows = await getInventoryView(interaction.user.id);
        if (rows.length === 0) {
                await interaction.reply({ content: 'No items in inventory!', ephemeral: true });
                return;
        }
        const lines = rows.map(row => `• ${row.name} — x${row.quantity} [${row.category}]`);
        await interaction.reply({ content: lines.join('\n'), ephemeral: true });
        },
};
