//ADMIN COMMAND
const { SlashCommandBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

const sanitizeCategory = (category) => (category || '').trim().toLowerCase();

module.exports = {
        data: new SlashCommandBuilder()
                .setName('additem')
                .setDescription('Add item to shop')
                .setDefaultMemberPermissions(0),
        async execute(interaction) {
                // Create the modal
                const modal = new ModalBuilder()
                        .setCustomId('additemmodal')
                        .setTitle('Add Item to Shop');

                // Create the text input components
                const itemNameInput = new TextInputBuilder()
                        .setCustomId('itemname')
                        .setLabel('Item Name')
                        .setStyle(TextInputStyle.Short);

                const itemPriceInput = new TextInputBuilder()
                        .setCustomId('itemprice')
                        .setLabel('Item Price (Leave blank for none)')
                        .setRequired(false)
                        .setStyle(TextInputStyle.Short);

                const itemDescriptionInput = new TextInputBuilder()
                        .setCustomId('itemdescription')
                        .setLabel('Item Description')
                        .setStyle(TextInputStyle.Paragraph);

                const itemCategoryInput = new TextInputBuilder()
                        .setCustomId('itemcategory')
                        .setLabel('Item Category')
                        .setStyle(TextInputStyle.Short);

                const warshipStatsInput = new TextInputBuilder()
                        .setCustomId('warshipstats')
                        .setLabel('Warship Stats (attack, defence, speed, hp)')
                        .setRequired(false)
                        .setStyle(TextInputStyle.Short);

                // Create action rows for each input
                const nameActionRow = new ActionRowBuilder().addComponents(itemNameInput);
                const priceActionRow = new ActionRowBuilder().addComponents(itemPriceInput);
                const descriptionActionRow = new ActionRowBuilder().addComponents(itemDescriptionInput);
                const categoryActionRow = new ActionRowBuilder().addComponents(itemCategoryInput);
                const warshipStatsActionRow = new ActionRowBuilder().addComponents(warshipStatsInput);

                // Add the action rows to the modal
                modal.addComponents(nameActionRow, priceActionRow, descriptionActionRow, categoryActionRow, warshipStatsActionRow);

                // Show the modal to the user
                await interaction.showModal(modal);
        },
};

module.exports.sanitizeCategory = sanitizeCategory;

