const { SlashCommandBuilder } = require('discord.js');
const { getShopItemByNameOrId } = require('../../db/shop');
const { grantItemToPlayer } = require('../../db/inventory');
const { pool } = require('../../pg-client');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Buy a shop item')
    .addStringOption(option =>
      option.setName('item')
        .setDescription('Item name or ID')
        .setRequired(true)
    ),
  async execute(interaction) {
    const userId = interaction.user.id;
    const nameOrId = interaction.options.getString('item');
    const item = await getShopItemByNameOrId(nameOrId);
    if (!item || !item.price) {
      return interaction.reply({ content: 'Item not found or price missing.', ephemeral: true });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query('SELECT amount FROM balances WHERE id=$1 FOR UPDATE', [userId]);
      const balance = rows[0]?.amount ?? 0;
      if (balance < item.price) {
        await client.query('ROLLBACK');
        return interaction.reply({ content: 'Insufficient funds.', ephemeral: true });
      }
      if (rows.length === 0) {
        await client.query('INSERT INTO balances (id, amount) VALUES ($1, $2)', [userId, balance - item.price]);
      } else {
        await client.query('UPDATE balances SET amount = amount - $2 WHERE id = $1', [userId, item.price]);
      }

      await grantItemToPlayer(userId, item.item_id, 1);
      await client.query('COMMIT');
      return interaction.reply(`Bought 1 ${item.item_id} for ${item.price} gold.`);
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch {}
      return interaction.reply({ content: 'Purchase failed.', ephemeral: true });
    } finally {
      client.release();
    }
  }
};
