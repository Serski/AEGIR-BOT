const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const marketplace = require('../../marketplace');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sales')
        .setDescription('List sales')
        .addIntegerOption(option =>
            option.setName('page')
                .setDescription('Page number')
                .setRequired(false)
        ),
    async execute(interaction) {
        const perPage = 10;
        let page = interaction.options.getInteger('page') ?? 1;
        page = Math.max(1, Number(page) || 1);
        let offset = (page - 1) * perPage;

        let { rows: sales, totalCount } = await marketplace.listSales({ limit: perPage, offset });
        const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
        if (page > totalPages) {
            page = totalPages;
            offset = (page - 1) * perPage;
            ({ rows: sales } = await marketplace.listSales({ limit: perPage, offset }));
        }

        const description = sales
            .map(({ name, item_id, price, quantity, seller }) =>
                `• ${quantity}× ${name} (${item_id}) — ${price ?? 'N/A'} gold — Seller: <@${seller}>`
            )
            .join('\n');

        const embed = new EmbedBuilder()
            .setTitle('Marketplace Listings')
            .setDescription(description || 'No sales found.')
            .setFooter({ text: `Page ${page} of ${totalPages}` });

        const rows = [];
        if (totalPages > 1) {
            const row = new ActionRowBuilder();
            if (page > 1) {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`salesSwitch${page - 1}`)
                        .setLabel('Prev')
                        .setStyle(ButtonStyle.Primary)
                );
            }
            if (page < totalPages) {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`salesSwitch${page + 1}`)
                        .setLabel('Next')
                        .setStyle(ButtonStyle.Primary)
                );
            }
            rows.push(row);
        }

        await interaction.reply({ embeds: [embed], components: rows, ephemeral: true });
    },
};
