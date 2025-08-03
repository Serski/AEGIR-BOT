//Passes saleID to inspectSale function in Marketplace.js

const { SlashCommandBuilder } = require('@discordjs/builders');
const Marketplace = require('../../Marketplace');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inspectsale')
        .setDescription('Inspect a sale')
        .addStringOption((option) =>
            option.setName('saleid')
                .setDescription('ID of sale to inspect')
                .setRequired(true)
        ),
    async execute(interaction) {
        const saleID = interaction.options.getString('saleid');
        let replyString = await Marketplace.inspectSale(saleID);
        //if embed, display embed, otherwise display string
        if (typeof (replyString) == 'string') {
            await interaction.reply(replyString);
        } else {
            await interaction.reply({ embeds: [replyString] });
        }
    },
};
