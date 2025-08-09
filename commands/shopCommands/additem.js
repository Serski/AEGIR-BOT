//ADMIN COMMAND
const { SlashCommandBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const shop = require('../../shop'); // Importing shop

module.exports = {
	data: new SlashCommandBuilder()
		.setName('additem')
		.setDescription('Add item to shop')
		.setDefaultMemberPermissions(0)
		.addStringOption(option => option.setName('itemname').setDescription('The name of the item').setRequired(true))
		.addStringOption(option => option.setName('itemicon').setDescription('The icon of the item').setRequired(true))
		.addStringOption(option => option.setName('itemdescription').setDescription('The description of the item').setRequired(true))
                .addStringOption(option => option.setName('itemcategory').setDescription('The category of the item').setRequired(true))
                .addStringOption(option => option.setName('itemprice').setDescription('The price of the item').setRequired(false))
                .addIntegerOption(option => option.setName('attack').setDescription('Attack (Warships only)').setRequired(false))
                .addIntegerOption(option => option.setName('defence').setDescription('Defence (Warships only)').setRequired(false))
                .addIntegerOption(option => option.setName('speed').setDescription('Speed (Warships only)').setRequired(false))
                .addIntegerOption(option => option.setName('hp').setDescription('HP (Warships only)').setRequired(false)),
        async execute(interaction) {
                // Gather common item data
                const itemName = interaction.options.getString('itemname');
                const itemData = {
                        Icon: interaction.options.getString('itemicon'),
                        Description: interaction.options.getString('itemdescription'),
                        Category: interaction.options.getString('itemcategory'),
                        "Transferrable (Y/N)": "Yes"
                };

                const price = parseInt(interaction.options.getString('itemprice'));
                if (price) {
                        itemData.Price = price;
                }

                // Include warship stats when applicable
                if (itemData.Category && itemData.Category.toLowerCase() === 'warships') {
                        itemData.Attack = interaction.options.getInteger('attack');
                        itemData.Defence = interaction.options.getInteger('defence');
                        itemData.Speed = interaction.options.getInteger('speed');
                        itemData.HP = interaction.options.getInteger('hp');
                }

                // Call the addItem function from the Shop class with the collected information
                shop.addItem(itemName, itemData);

                // Show the modal to the user
                await interaction.reply(`Item '${itemName}' has been added to the item list. Edit it using /edititemmenu. Give it a price to add to shop.`);
        },
};
