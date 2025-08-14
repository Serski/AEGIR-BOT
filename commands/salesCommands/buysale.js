//Passes saleID, userTag, userID to buySale function in marketplace.js

const { SlashCommandBuilder } = require('@discordjs/builders');
const { buySale } = require('../../marketplace');
const characters = require('../../db/characters');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('buysale')
        .setDescription('Buy a sale')
        .addStringOption((option) =>
            option.setName('saleid')
                .setDescription('ID of sale to buy')
                .setRequired(true)
        ),
    async execute(interaction) {
        const saleID = interaction.options.getString('saleid');
        const userTag = interaction.user.tag;
        const userID = await characters.ensureAndGetId(interaction.user);
        let replyString = await buySale(saleID, userTag, userID);
        //if embed, display embed, otherwise display string
        if (typeof (replyString) == 'string') {
            await interaction.reply(replyString);
        } else {
            await interaction.reply({ embeds: [replyString] });
        }
    },
};
