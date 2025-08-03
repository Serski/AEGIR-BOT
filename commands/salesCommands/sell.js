const { SlashCommandBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const Marketplace = require('../../Marketplace'); // Importing marketplace

//use Marketplace.postSale to post a sale
module.exports = {
    data: new SlashCommandBuilder()
        .setName('sell')
        .setDescription('Sell an item')
        .addStringOption((option) =>
            option.setName('itemname')
                .setDescription('The item name')
                .setRequired(true)
        )
        .addIntegerOption((option) =>
            option.setName('quantity')
                .setDescription('The quantity of the item')
                .setRequired(true)
        )
        .addIntegerOption((option) =>
            option.setName('price')
                .setDescription('The price of the item')
                .setRequired(true)
        ),
    async execute(interaction) {
        const itemName = interaction.options.getString('itemname');
        const quantity = interaction.options.getInteger('quantity');
        const price = interaction.options.getInteger('price');

        (async () => {
            let reply = await Marketplace.postSale(quantity, itemName, price, interaction.user.tag, interaction.user.id)
            if (typeof (reply) == 'string') {
                await interaction.reply(reply);
            } else {
                await interaction.reply({ embeds: [reply] });
            }
        })()
    }
};
