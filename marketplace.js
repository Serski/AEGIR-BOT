const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { pool } = require('./pg-client');
const inventory = require('./db/inventory');
const items = require('./db/items');
const { listSales } = require('./db/marketplace');

// Create a marketplace listing for the provided item. Items are removed from the
// seller's inventory immediately and held until the sale is purchased or
// cancelled.
async function postSale({ userId, rawItem, price = 0, quantity = 1 }) {
  const itemCode = await items.resolveItemCode(rawItem);

  const owned = await inventory.getCount(userId, itemCode);
  if (owned < quantity) {
    return { ok: false, reason: 'not_enough', owned, needed: quantity };
  }

  // remove the items from the seller
  const removed = await inventory.take(userId, itemCode, quantity);
  if (removed !== quantity) {
    return { ok: false, reason: 'concurrent_change' };
  }

  const meta = await items.getItemMetaByCode(itemCode);
  const name = meta?.name || itemCode;

  await pool.query(
    'INSERT INTO marketplace (name, item_code, price, seller, quantity) VALUES ($1,$2,$3,$4,$5)',
    [name, itemCode, price, userId, quantity]
  );

  return { ok: true, itemCode, price, quantity };
}

// ---------------------------------------------------------------------------
// Listing helpers
// ---------------------------------------------------------------------------

// Render a paginated list of all sales on the marketplace. Returns an embed and
// an array of ActionRows for navigation buttons.
async function createSalesEmbed(page = 1) {
  const sales = await listSales();
  const perPage = 10;
  const totalPages = Math.max(1, Math.ceil(sales.length / perPage));
  const curPage = Math.min(Math.max(1, Number(page) || 1), totalPages);
  const slice = sales.slice((curPage - 1) * perPage, curPage * perPage);

  const description = slice
    .map(({ name, price, category }) =>
      `• ${name} — Category: ${category} — ${price ?? 'N/A'} gold`
    )
    .join('\n');

  const embed = new EmbedBuilder()
    .setTitle('Marketplace Listings')
    .setDescription(description || 'No sales found.')
    .setFooter({ text: `Page ${curPage} of ${totalPages}` });

  const rows = [];
  if (totalPages > 1) {
    const row = new ActionRowBuilder();
    if (curPage > 1) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`salesSwitch${curPage - 1}`)
          .setLabel('Prev')
          .setStyle(ButtonStyle.Primary)
      );
    }
    if (curPage < totalPages) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`salesSwitch${curPage + 1}`)
          .setLabel('Next')
          .setStyle(ButtonStyle.Primary)
      );
    }
    rows.push(row);
  }

  return [embed, rows];
}

// Show the sales for a specific user. Returns an Embed or a string if none.
async function showSales(userId, page = 1) {
  const { rows } = await pool.query(
    'SELECT id, name, price, quantity FROM marketplace WHERE seller = $1 ORDER BY name',
    [userId]
  );

  if (rows.length === 0) return 'No sales found.';

  const perPage = 10;
  const totalPages = Math.max(1, Math.ceil(rows.length / perPage));
  const curPage = Math.min(Math.max(1, Number(page) || 1), totalPages);
  const slice = rows.slice((curPage - 1) * perPage, curPage * perPage);

  const description = slice
    .map(({ id, name, price, quantity }) =>
      `ID: ${id} — ${quantity}× ${name} — ${price} gold each`
    )
    .join('\n');

  const embed = new EmbedBuilder()
    .setTitle('Player Sales')
    .setDescription(description)
    .setFooter({ text: `Page ${curPage} of ${totalPages}` });

  return embed;
}

// Display details of a single sale by ID.
async function inspectSale(saleId) {
  const { rows } = await pool.query(
    'SELECT id, name, price, quantity, seller FROM marketplace WHERE id = $1',
    [saleId]
  );
  if (!rows[0]) return 'Sale not found.';
  const sale = rows[0];
  const embed = new EmbedBuilder()
    .setTitle(`Sale ${sale.id}`)
    .setDescription(
      `${sale.quantity}× ${sale.name}\nPrice: ${sale.price} gold each\nSeller: <@${sale.seller}>`
    );
  return embed;
}

// Purchase a sale and transfer items and gold appropriately.
async function buySale(saleId, buyerTag, buyerId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      'SELECT id, name, price, quantity, seller, item_code FROM marketplace WHERE id = $1 FOR UPDATE',
      [saleId]
    );
    if (!rows[0]) {
      await client.query('ROLLBACK');
      return 'Sale not found.';
    }
    const sale = rows[0];
    const totalPrice = sale.price * sale.quantity;

    const balRes = await client.query(
      'SELECT amount FROM balances WHERE id = $1 FOR UPDATE',
      [buyerId]
    );
    const balance = balRes.rows[0]?.amount ?? 0;
    if (balance < totalPrice) {
      await client.query('ROLLBACK');
      return 'Insufficient funds.';
    }

    await client.query('UPDATE balances SET amount = amount - $2 WHERE id = $1', [buyerId, totalPrice]);
    await client.query(
      'INSERT INTO balances (id, amount) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET amount = balances.amount + EXCLUDED.amount',
      [sale.seller, totalPrice]
    );

    await inventory.give(buyerId, sale.item_code, sale.quantity);
    await client.query('DELETE FROM marketplace WHERE id = $1', [saleId]);

    await client.query('COMMIT');
    return `${buyerTag} bought ${sale.quantity}× ${sale.name} for ${totalPrice} gold.`;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    return 'Failed to buy sale.';
  } finally {
    client.release();
  }
}

module.exports = {
  postSale,
  listSales,
  createSalesEmbed,
  showSales,
  inspectSale,
  buySale,
};

