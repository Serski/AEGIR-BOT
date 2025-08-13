//Passes saleID to inspectSale function in marketplace.js

const { SlashCommandBuilder } = require('@discordjs/builders');
const marketplace = require('../../marketplace');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('showsales')
        .setDescription('Show a players sales')
        .addUserOption((option) =>
            option.setName('player')
                .setDescription('Player to show sales for')
                .setRequired(false)
        )
        .addIntegerOption((option) =>
            option.setName('page')
                .setDescription('Page number')
                .setRequired(false)
        ),
    async execute(interaction) {
        const player = interaction.options.getUser('player') ?? interaction.user;
        const page = interaction.options.getInteger('page') ?? 1;
        const res = await marketplace.showSales(player.id, page);
        if (typeof res === 'string') {
            await interaction.reply(res);
        } else {
            await interaction.reply({ embeds: [res] });
        }
    },
};
