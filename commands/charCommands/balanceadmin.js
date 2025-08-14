const { SlashCommandBuilder } = require('discord.js');
const characters = require('../../db/characters');
const db = require('../../pg-client');
const dbm = require('../../database-manager');
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
        const charData = await dbm.loadFile('characters', charID);
        if (!charData) {
                await interaction.reply('Player not found.');
                return;
        }
        const { rows } = await db.query('SELECT amount FROM balances WHERE id=$1', [charID]);
        const amount = rows[0]?.amount || 0;
        const embed = {
                color: 0x36393e,
                author: {
                        name: charData.name,
                        icon_url: charData.icon ? charData.icon : 'https://cdn.discordapp.com/attachments/890351376004157440/1332678517888126986/NEW_LOGO_CLEAN_smallish.png?ex=6798c416&is=67977296&hm=ada5afdd0bcb677d3a0a1ca6aabe55f554810e3044048ac4e5cd85d0d73e7f0d&',
                },
                description: `${clientManager.getEmoji('Gold')} **${amount}**`,
        };
        await interaction.reply({ embeds: [embed] });
        },
};
