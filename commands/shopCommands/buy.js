const { SlashCommandBuilder } = require('discord.js');
const pool = require('../../pg-client');
const inventory = require('../../db/inventory');
const characters = require('../../db/characters');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Buy a shop item')
    .addStringOption(option =>
      option.setName('item_id')
        .setDescription('Item identifier')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('quantity')
        .setDescription('Number of items to buy')
        .setRequired(false)
        .setMinValue(1)
    ),
  async execute(interaction) {
    const userId = await characters.ensureAndGetId(interaction.user);
    const itemId = interaction.options.getString('item_id');
    const qty = interaction.options.getInteger('quantity') ?? 1;

    // read price from shop to prevent client-side spoofing
    const { rows } = await pool.query(
      `SELECT (data->>'price')::numeric AS price,
              data->>'item' AS name
         FROM shop
        WHERE data->>'item_id' = $1`,
      [itemId]
    );
    const row = rows[0];
    if (!row) return interaction.reply({ ephemeral: true, content: `Item not in shop.` });

    const total = (row.price || 0) * qty;

    // charge balance (replace with your money module/logic)
    const bal = await pool.query(`SELECT amount FROM balances WHERE id=$1`, [userId]);
    const current = bal.rows[0]?.amount ?? 0;
    if (current < total) return interaction.reply({ ephemeral: true, content: `Not enough money.` });

    await pool.query(`UPDATE balances SET amount = amount - $2 WHERE id = $1`, [userId, total]);

    // grant the item(s)
    await inventory.give(userId, itemId, qty);

    return interaction.reply(`Bought ${qty} × ${row.name} for ${total}.`);
  }
};
