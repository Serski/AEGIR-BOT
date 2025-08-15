const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { listShopItems } = require('../../db/shop');
const logger = require('../../logger');

async function createAllItemsEmbed(page = 1) {
  page = Number(page);
  const itemsPerPage = 25;
  const rows = await listShopItems();

  const itemCategories = {};
  for (const row of rows) {
    const priceVal = row.price;
    if (priceVal === '' || priceVal === undefined || priceVal === null) continue;
    if (Number.isNaN(Number(priceVal))) continue;
    const category = row.category ?? 'Other';
    if (!itemCategories[category]) itemCategories[category] = [];
    const itemName = row.name;
    const icon = '';
    itemCategories[category].push({ name: itemName, icon });
  }

  const sortedCategories = Object.keys(itemCategories)
    .sort()
    .reduce((acc, key) => {
      acc[key] = itemCategories[key];
      return acc;
    }, {});

  const categories = Object.keys(sortedCategories);
  const pages = Math.max(1, Math.ceil(categories.length / itemsPerPage));
  if (page > pages) page = pages;
  const start = (page - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const pageCategories = categories.slice(start, end);

  const embed = new EmbedBuilder().setTitle('All Items').setColor(0x36393e);

  for (const category of pageCategories) {
    const value = sortedCategories[category]
      .map(({ name, icon }) => `${icon} ${name}`)
      .join('\n');
    embed.addFields({ name: category, value });
  }

  const totalPages = Math.max(1, Math.ceil(categories.length / itemsPerPage));
  embed.setFooter({ text: `Page ${page} of ${totalPages}` });

  const prevButton = new ButtonBuilder()
    .setCustomId('allitems_page' + (page - 1))
    .setLabel('<')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(page === 1);

  const nextButton = new ButtonBuilder()
    .setCustomId('allitems_page' + (page + 1))
    .setLabel('>')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(page === totalPages);

  const actionRow = new ActionRowBuilder().addComponents(prevButton, nextButton);
  return [embed, actionRow];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('allitems')
    .setDefaultMemberPermissions(0)
    .setDescription('List all items'),
  async execute(interaction) {
    const [embed, row] = await createAllItemsEmbed(1);
    logger.debug(row);
    await interaction.reply({ embeds: [embed], components: [row] });
  },
};
