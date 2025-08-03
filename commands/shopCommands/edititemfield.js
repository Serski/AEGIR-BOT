const { SlashCommandBuilder } = require('discord.js');
const Shop = require('../../Shop'); // Importing the database manager

///editfield <field number> <new value>
module.exports = {
	data: new SlashCommandBuilder()
        .setName('edititemfield')
        .setDescription('Edit a field of an item in the Shop. Use /edititemmenu first to see the fields of an item')
        .setDefaultMemberPermissions(0)
        .addIntegerOption((option) =>
            option.setName('fieldnumber')
                .setDescription('The field number')
                .setRequired(true)
        )
        .addStringOption((option) =>
            option.setName('newvalue')
                .setDescription('The new value')
                .setRequired(false)
        ),
    async execute(interaction) {
        const fieldNumber = interaction.options.getInteger('fieldnumber');
        const newValue = interaction.options.getString('newvalue');

        console.log('new value: ' + newValue);

        let reply = await Shop.editItemField(interaction.user.tag, fieldNumber, newValue);
        await interaction.reply(reply);
    }
};