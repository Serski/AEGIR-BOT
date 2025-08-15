const { SlashCommandBuilder } = require('discord.js');
const shop = require('../../shop');
const logger = require('../../logger');

///editfield <field number> <new value>
module.exports = {
	data: new SlashCommandBuilder()
        .setName('edititemfield')
        .setDescription('Edit a field of an item in the shop. Use /edititemmenu first to see the fields of an item')
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

        logger.debug('new value: ' + newValue);

        let reply = await shop.editItemField(interaction.user.tag, fieldNumber, newValue);
        await interaction.reply(reply);
    }
};
