//Passes saleID to inspectSale function in marketplace.js

const { SlashCommandBuilder } = require('@discordjs/builders');
const { inspectSale } = require('../../marketplace');

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
        try {
            const saleID = interaction.options.getString('saleid');
            let replyString = await inspectSale(saleID);
            //if embed, display embed, otherwise display string
            if (typeof (replyString) == 'string') {
                await interaction.reply(replyString);
            } else {
                await interaction.reply({ embeds: [replyString] });
            }
        } catch (err) {
            console.error(err.stack);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'Failed to process your request.', ephemeral: true });
            } else {
                await interaction.reply({ content: 'Failed to process your request.', ephemeral: true });
            }
        }
    },
};
