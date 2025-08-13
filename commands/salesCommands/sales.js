const { SlashCommandBuilder } = require('discord.js');
const { createSalesEmbed } = require('../../marketplace');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sales')
        .setDescription('List sales')
        .addIntegerOption(option =>
            option.setName('page')
                .setDescription('Page number')
                .setRequired(false)
        ),
    async execute(interaction) {
        const page = interaction.options.getInteger('page') ?? 1;
        const [embed, rows] = await createSalesEmbed(page);
        await interaction.reply({ embeds: [embed], components: rows, ephemeral: true });
    },
};
