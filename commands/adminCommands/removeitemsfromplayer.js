// Admin command

const { SlashCommandBuilder } = require('discord.js');
const characters = require('../../db/characters');
const items = require('../../db/items');
const inventory = require('../../db/inventory');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removeitemsfromplayer')
        .setDescription('Removes items from a player')
        .setDefaultMemberPermissions(0)
        .addUserOption(option => option.setName('player').setDescription('The player to remove items from').setRequired(true))
        .addStringOption(option => option.setName('item').setDescription('The item to remove').setRequired(true))
        .addIntegerOption(option => option.setName('quantity').setDescription('The amount of items to remove').setRequired(false)),
    async execute(interaction) {
        try {
            const player = interaction.options.getUser('player');
            const item = interaction.options.getString('item');
            const qty = interaction.options.getInteger('quantity') ?? 1;

            const charId = await characters.ensureAndGetId(player);
            const itemCode = await items.resolveItemCode(item);
            await inventory.take(charId, itemCode, qty);

            return interaction.reply({ content: `Removed ${qty} ${item} from <@${player.id}>`, ephemeral: true });
        }
        catch (err) {
            console.error(err.stack);
            return interaction.reply({ content: 'Failed to process your request.', ephemeral: true });
        }
    },
};
