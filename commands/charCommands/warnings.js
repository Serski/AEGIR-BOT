//Admin command

const { SlashCommandBuilder } = require('discord.js');
const Char = require('../../Char'); // Importing the database manager

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warnings')
        .setDescription('Check warnings')
        .addUserOption(option => option.setName('player').setDescription('The player to check warnings of').setRequired(false)),
    async execute(interaction) {
        const player = interaction.options.getUser('player')?.tag || interaction.user.tag;
        const response = await Char.checkWarns(player);

        return interaction.reply(response);
    },
};