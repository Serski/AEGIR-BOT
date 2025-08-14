const { SlashCommandBuilder } = require('discord.js');
const characters = require('../../db/characters');
const db = require('../../pg-client');
const clientManager = require('../../clientManager');

module.exports = {
        data: new SlashCommandBuilder()
                .setName('bank')
                .setDescription('Show bank'),
        async execute(interaction) {
                const charID = await characters.ensureAndGetId(interaction.user);
                const { rows } = await db.query('SELECT amount FROM bank WHERE id=$1', [charID]);
                const amount = rows[0]?.amount || 0;
                const embed = {
                        color: 0x36393e,
                        description: `${clientManager.getEmoji('Gold')} **${amount}**`,
                };
                await interaction.reply({ embeds: [embed], ephemeral: true });
        },
};
