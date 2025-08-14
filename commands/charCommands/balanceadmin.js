const { SlashCommandBuilder } = require('discord.js');
const characters = require('../../db/characters');
const db = require('../../pg-client');
const clientManager = require('../../clientManager');

module.exports = {
        data: new SlashCommandBuilder()
                .setName('balanceadmin')
                .setDescription('Show balance of a player')
        .addUserOption(option => option.setName('player').setDescription('The player to show the balance of').setRequired(true))
        .setDefaultMemberPermissions(0),
        async execute(interaction) {
                const target = interaction.options.getUser('player');
        const charID = await characters.ensureAndGetId(target);
        const { rows } = await db.query('SELECT amount FROM balances WHERE id=$1', [charID]);
        const amount = rows[0]?.amount || 0;
        const embed = {
                color: 0x36393e,
                description: `${clientManager.getEmoji('Gold')} **${amount}**`,
        };
        await interaction.reply({ content: `Balance for ${target}:`, embeds: [embed], ephemeral: true });
        },
};
