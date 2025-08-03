//Passes saleID to inspectSale function in Marketplace.js

const { SlashCommandBuilder } = require('@discordjs/builders');
const Marketplace = require('../../Marketplace');
const DataGetters = require('../../DataGetters');

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
        let player = interaction.options.getUser('player');
        let page = interaction.options.getInteger('page');
        console.log(player);
        if (!player) {
            player = interaction.user;
        }
        if (!page) {
            page = 1;
        }

        player = await DataGetters.getCharFromNumericID(player.id);

        console.log(player);

        let replyString = await Marketplace.showSales(player, page);
        //if embed, display embed, otherwise display string
        if (typeof (replyString) == 'string') {
            await interaction.reply(replyString);
        } else {
            await interaction.reply({ embeds: [replyString] });
        }
    },
};
