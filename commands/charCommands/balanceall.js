const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../pg-client');
const logger = require('../../logger');

const PAGE_SIZE = 25;

async function balanceAll(pageNumber = 1) {
        const { rows } = await db.query(
                `SELECT b.id, b.amount, c.data->>'numeric_id' AS numeric_id
                   FROM balances b
                   LEFT JOIN characters c ON c.id = b.id
                  ORDER BY b.amount DESC`
        );
        const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
        const page = Math.min(Math.max(1, pageNumber), totalPages);
        const start = (page - 1) * PAGE_SIZE;
        const slice = rows.slice(start, start + PAGE_SIZE);
        const description = slice.map(r => `**<@${r.numeric_id || '0'}>**: ${r.amount}`).join('\n') || 'No balances found.';
        const embed = { color: 0x36393e, title: '**__Balance__**', description };
        const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                        .setCustomId(`switch_bala${page - 1}`)
                        .setLabel('Previous')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page === 1),
                new ButtonBuilder()
                        .setCustomId(`switch_bala${page + 1}`)
                        .setLabel('Next')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page === totalPages)
        );
        return [embed, [row]];
}

module.exports = {
        data: new SlashCommandBuilder()
                .setName('balanceall')
                .setDescription('Show balance of all players')
                .setDefaultMemberPermissions(0),
        async execute(interaction) {
                try {
                        const [embed, rows] = await balanceAll(1);
                        await interaction.reply({ embeds: [embed], components: rows });
                }
                catch (err) {
                        logger.error(err.stack);
                        return interaction.reply({ content: 'Failed to process your request.', ephemeral: true });
                }
        },
        balanceAll,
};

