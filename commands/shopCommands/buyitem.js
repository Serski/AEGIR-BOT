const { SlashCommandBuilder } = require('discord.js');
const { pool } = require('../../pg-client');
const characters = require('../../db/characters');

async function findShopItem(term) {
  const { rows } = await pool.query(`
    SELECT id, name, item_code, price, category
    FROM shop_v
    WHERE LOWER(item_code) = $1
       OR name ILIKE $2
    LIMIT 1
  `, [term.toLowerCase(), term]);
  return rows[0] || null;
}

async function getPlayerBalance(playerId) {
  const { rows } = await pool.query(
    `SELECT gold FROM balances WHERE id = $1`,
    [playerId]
  );
  return rows[0]?.gold ?? 0;
}

async function buy(playerId, itemTerm, qty) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const item = await findShopItem(itemTerm);
    if (!item) throw new Error(`Item "${itemTerm}" not found in shop.`);

    const category = (item.category || '').trim();
    const price = Number(item.price);
    if (!category || !price || !(price > 0)) {
      throw new Error('Not a valid item to purchase!');
    }

    const priceTotal = price * (qty || 1);

    const balRes = await client.query(
      `SELECT gold FROM balances WHERE id = $1 FOR UPDATE`,
      [playerId]
    );
    const currentGold = balRes.rows[0]?.gold ?? 0;
    if (currentGold < priceTotal) {
      throw new Error(`Not enough gold. Need ${priceTotal}, you have ${currentGold}.`);
    }

    for (let i = 0; i < qty; i++) {
      await client.query(
        `INSERT INTO inventory_items (instance_id, owner_id, item_id, durability, metadata)
         VALUES (gen_random_uuid()::text, $1, $2, NULL, '{}'::jsonb)`,
        [playerId, item.item_code]
      );
    }

    await client.query(
      `UPDATE balances SET gold = gold - $2 WHERE id = $1`,
      [playerId, priceTotal]
    );

    await client.query('COMMIT');
    return { ok: true, item, qty, priceTotal };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('buyitem')
    .setDescription('Buy an item')
    .addStringOption(opt =>
      opt.setName('item')
        .setDescription('Item to buy')
        .setRequired(true))
    .addIntegerOption(opt =>
      opt.setName('qty')
        .setDescription('Quantity to buy')
        .setRequired(false)),
  async execute(interaction) {
    const itemTerm = interaction.options.getString('item', true);
    const qty = interaction.options.getInteger('qty') ?? 1;
    const playerId = await characters.ensureAndGetId(interaction.user);
    try {
      const result = await buy(playerId, itemTerm, qty);
      await interaction.reply(`Bought ${qty} × ${result.item.name} for ${result.priceTotal} gold.`);
    } catch (err) {
      await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
  },
};
