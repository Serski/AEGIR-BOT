const { SlashCommandBuilder } = require('discord.js');
const char = require('../../char'); // Importing the database manager
const characters = require('../../db/characters');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('useitem')
		.setDescription('Use an item')
		.addStringOption((option) =>
		option.setName('itemname')
			.setDescription('The item name')
			.setRequired(true)
		)
		.addIntegerOption((option) => 
        option.setName('numbertouse')
			.setDescription('How many do you want to buy (Leave blank for 1)')
			.setRequired(false)
		),
        async execute(interaction) {
                const itemName = interaction.options.getString('itemname');
        const numberItems = interaction.options.getInteger('numbertouse');
        const charID = await characters.ensureAndGetId(interaction.user);
            let reply = await char.useItem(itemName, charID, numberItems)
            if (typeof(reply) == 'string') {
                await interaction.reply(reply);
            } else {
                await interaction.reply({ embeds: [reply] });
            }
                        // Call the useItem function from the Shop class
        },
};