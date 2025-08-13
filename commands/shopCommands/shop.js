const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { listShopItems } = require('../../db/shop');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('List shop items'),
  async execute(interaction) {
    const items = await listShopItems();
    const lines = items.map(i => `**${i.name}** — Category: ${i.category ?? 'N/A'} — ${i.price == null ? 'N/A' : `${i.price} gold`}`);
    const embed = new EmbedBuilder().setTitle('Shop Items').setDescription(lines.join('\n'));
    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
