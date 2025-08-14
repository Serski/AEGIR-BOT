const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../pg-client');
const characters = require('../../db/characters');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dbcheck')
    .setDescription('Debug: show items from v_inventory for your character')
    .addStringOption(opt =>
      opt.setName('character_id')
        .setDescription('Optional: override character id')
        .setRequired(false)
    ),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const provided = interaction.options.getString('character_id') ?? undefined;
    const resolved = provided ?? await characters.ensureAndGetId(interaction.user);
    const characterId = resolved === 'ERROR' ? undefined : resolved;

    if (!characterId) {
      await interaction.editReply('No character_id found. Provide one with `/dbcheck character_id:<id>`.');
      return;
    }

    let rows;
    try {
      const res = await db.query(
        `SELECT character_id, item_id, quantity, name, category
           FROM v_inventory
           WHERE character_id = $1
           ORDER BY category, name`,
        [characterId]
      );
      rows = res.rows;
    } catch (err) {
      await interaction.editReply(`DB error while reading v_inventory: ${err.message || err}`);
      return;
    }

    if (!rows.length) {
      await interaction.editReply(`No items found in v_inventory for \`${characterId}\`.`);
      return;
    }

    const lines = rows.map(r => `• **${r.name}** (${r.item_id}) — x${r.quantity} _[${r.category}]_`);
    const chunks = [];
    for (let i = 0; i < lines.length; i += 20) {
      chunks.push(lines.slice(i, i + 20).join('\n'));
    }

    const embeds = chunks.map((chunk, idx) =>
      new EmbedBuilder()
        .setTitle(`v_inventory for ${characterId} (${idx + 1}/${chunks.length})`)
        .setDescription(chunk)
        .setTimestamp(new Date())
    );

    await interaction.editReply({ embeds });
  }
};
