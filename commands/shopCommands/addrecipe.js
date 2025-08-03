//ADMIN COMMAND
const { SlashCommandBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const Shop = require('../../Shop');
//const Shop = require('../../Shop'); // Importing shop

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addrecipe')
        .setDefaultMemberPermissions(0)
        .setDescription('Create a new recipe')
        .addStringOption(option => option.setName('recipename')
            .setDescription('The name of the recipe')
            .setRequired(false)),
    async execute(interaction) {
        let recipeName = interaction.options.getString('recipename');
        if (!recipeName) {
            recipeName = 'New Recipe';
        }

        recipeName = await Shop.addRecipe(recipeName);
        
        // Respons with an ephemeral message saying that recipe should appear below
        await interaction.reply({ content: 'Edit recipe menu should appear below', ephemeral: true });

        // Show the edit recipe menu
        let reply = await Shop.editRecipeMenu(recipeName, interaction.user.tag);
        if (typeof(reply) == 'string') {
            await interaction.followUp(reply);
        } else {
            await interaction.followUp({ embeds: [reply]});
        }
    },
};
