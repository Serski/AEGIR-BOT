//ADMIN COMMAND
const { SlashCommandBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

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

                const itemIconInput = new TextInputBuilder()
                        .setCustomId('itemicon')
                        .setLabel('Item Icon- Emoji to go before name in shop')
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

                const attackInput = new TextInputBuilder()
                        .setCustomId('attack')
                        .setLabel('Attack (Warships only)')
                        .setRequired(false)
                        .setStyle(TextInputStyle.Short);

                const defenceInput = new TextInputBuilder()
                        .setCustomId('defence')
                        .setLabel('Defence (Warships only)')
                        .setRequired(false)
                        .setStyle(TextInputStyle.Short);

                const speedInput = new TextInputBuilder()
                        .setCustomId('speed')
                        .setLabel('Speed (Warships only)')
                        .setRequired(false)
                        .setStyle(TextInputStyle.Short);

                const hpInput = new TextInputBuilder()
                        .setCustomId('hp')
                        .setLabel('HP (Warships only)')
                        .setRequired(false)
                        .setStyle(TextInputStyle.Short);

                // Create action rows for each input
                const nameActionRow = new ActionRowBuilder().addComponents(itemNameInput);
                const iconActionRow = new ActionRowBuilder().addComponents(itemIconInput);
                const priceActionRow = new ActionRowBuilder().addComponents(itemPriceInput);
                const descriptionActionRow = new ActionRowBuilder().addComponents(itemDescriptionInput);
                const categoryActionRow = new ActionRowBuilder().addComponents(itemCategoryInput);
                const attackActionRow = new ActionRowBuilder().addComponents(attackInput);
                const defenceActionRow = new ActionRowBuilder().addComponents(defenceInput);
                const speedActionRow = new ActionRowBuilder().addComponents(speedInput);
                const hpActionRow = new ActionRowBuilder().addComponents(hpInput);

                // Add the action rows to the modal
                modal.addComponents(nameActionRow, iconActionRow, priceActionRow, descriptionActionRow, categoryActionRow, attackActionRow, defenceActionRow, speedActionRow, hpActionRow);

                // Show the modal to the user
                await interaction.showModal(modal);
        },
};

