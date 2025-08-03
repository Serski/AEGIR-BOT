const { SlashCommandBuilder } = require('discord.js');
const Shop = require('../../Shop'); // Importing the database manager

module.exports = {
	data: new SlashCommandBuilder()
		.setName('buyitem')
		.setDescription('Buy an item')
        .addIntegerOption((option) => 
        option.setName('numbertobuy')
			.setDescription('How many do you want to buy')
			.setRequired(true)
		)
		.addStringOption((option) =>
		option.setName('itemname')
			.setDescription('The item name')
			.setRequired(true)
		),
	execute(interaction) {
		const itemName = interaction.options.getString('itemname');
        const numberItems = interaction.options.getInteger('numbertobuy');

		(async () => {
            let reply = await Shop.buyItem(itemName, interaction.user.tag, numberItems, interaction.channelId)
            interaction.reply(reply);
			// Call the addItem function from the Shop class
		})()
	},
};