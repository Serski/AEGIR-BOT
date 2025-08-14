const { SlashCommandBuilder } = require('discord.js');
const characters = require('../../db/characters');
const dbm = require('../../database-manager');
const clientManager = require('../../clientManager');

module.exports = {
        data: new SlashCommandBuilder()
                .setName('bank')
                .setDescription('Show bank'),
        async execute(interaction) {
                const charID = await characters.ensureAndGetId(interaction.user);
        const charData = await dbm.loadFile('characters', charID);
        if (!charData) {
                await interaction.reply("You haven't made a character! Use /newchar first");
                return;
        }
        const embed = {
                color: 0x36393e,
                author: {
                        name: charData.name,
                        icon_url: charData.icon ? charData.icon : 'https://cdn.discordapp.com/attachments/890351376004157440/1332678517888126986/NEW_LOGO_CLEAN_smallish.png?ex=6798c416&is=67977296&hm=ada5afdd0bcb677d3a0a1ca6aabe55f554810e3044048ac4e5cd85d0d73e7f0d&',
                },
                description: clientManager.getEmoji("Gold") + " **" + (charData.bank || 0) + "**",
        };
        await interaction.reply({ embeds: [embed] });
        },
};
