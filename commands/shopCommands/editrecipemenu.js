const { SlashCommandBuilder } = require('discord.js');
const shop = require('../../shop');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('editrecipemenu')
		.setDescription('Show the edit recipe menu')
		.setDefaultMemberPermissions(0)
		.addStringOption((option) =>
		option.setName('recipename')
			.setDescription('The recipe name')
			.setRequired(true)
		),
	async execute(interaction) {
		const recipeName = interaction.options.getString('recipename');
			//shop.editrecipeMenu returns an array with the first element being the replyEmbed and the second element being the rows
			let reply = await shop.editRecipeMenu(recipeName, interaction.user.tag);
            if (typeof(reply) == 'string') {
                await interaction.reply(reply);
            } else {
                await interaction.reply({ embeds: [reply]});
            }
	},
};