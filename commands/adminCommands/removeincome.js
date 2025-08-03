const { SlashCommandBuilder } = require('discord.js');
const Shop = require('../../Shop'); // Importing the database manager

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removeincome')
        .setDescription('Delete an income. This is destructive and cannot be undone.')
        .setDefaultMemberPermissions(0)
        .addStringOption((option) =>
        option.setName('income')
            .setDescription('The income name')
            .setRequired(true)
        ),
    execute(interaction) {
        const itemName = interaction.options.getString('income');

        (async () => {
            let returnString = await Shop.removeIncome(itemName);

			if (returnString) {
				await interaction.reply(returnString);
			} else {
				await interaction.reply(`Income '${itemName}' has been removed.`);
			}
            // Call the addItem function from the Shop class
        })()
    },
};