const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { RECIPES } = require('./craft');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('crafting')
        .setDescription('List available crafting recipes'),
    async execute(interaction) {
        const embed = new EmbedBuilder().setTitle('Crafting Recipes');
        for (const [item, ingredients] of Object.entries(RECIPES)) {
            const list = Object.entries(ingredients)
                .map(([key, val]) => `${val}x ${key}`)
                .join(', ');
            embed.addFields({ name: item, value: list || 'No ingredients' });
        }
        return interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
