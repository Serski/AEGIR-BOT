const { SlashCommandBuilder } = require('discord.js');
const shop = require('../../shop');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('edititemmenu')
		.setDescription('Show the edit item menu')
		.setDefaultMemberPermissions(0)
		.addStringOption((option) =>
		option.setName('itemname')
			.setDescription('The item name')
			.setRequired(true)
		),
	async execute(interaction) {
		const itemName = interaction.options.getString('itemname');
			//shop.editItemMenu returns an array with the first element being the replyEmbed and the second element being the rows
			let reply = await shop.editItemMenu(itemName, 1, interaction.user.tag);
            if (typeof(reply) == 'string') {
                await interaction.reply(reply);
            } else {
				let replyEmbed = reply[0];
				let rows = reply[1];
                await interaction.reply({ embeds: [replyEmbed], components: [rows]});
            }
	},
};