const { SlashCommandBuilder } = require('discord.js');
const pool = require('../../pg-client');
const inventory = require('../../db/inventory');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Buy a shop item')
    .addStringOption(option =>
      option.setName('item_code')
        .setDescription('Item code')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('quantity')
        .setDescription('Number of items to buy')
        .setRequired(false)
        .setMinValue(1)
    ),
  async execute(interaction) {
    const userId = interaction.user.id;
    const itemCode = interaction.options.getString('item_code');
    const qty = interaction.options.getInteger('quantity') ?? 1;

    // read price from shop_v to prevent client-side spoofing
    const { rows } = await pool.query(
      `SELECT price, name FROM shop_v WHERE item_code = $1`,
      [itemCode]
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
    await inventory.give(userId, itemCode, qty);

    return interaction.reply(`Bought ${qty} × ${row.name} for ${total}.`);
  }
};
