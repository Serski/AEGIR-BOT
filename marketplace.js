const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { pool } = require('./pg-client');
const inventory = require('./db/inventory');
const items = require('./db/items');
const { listSales } = require('./db/marketplace');
const logger = require('./logger');

// Create a marketplace listing for the provided item. Items are removed from the
// seller's inventory immediately and held until the sale is purchased or
// cancelled.
async function postSale({ userId, rawItem, price = 0, quantity = 1 }) {
  const itemCode = await items.resolveItemCode(rawItem);

  const owned = await inventory.getCount(userId, itemCode);
  if (owned < quantity) {
    logger.warn('[marketplace.postSale] not_enough', {
      userId,
      itemCode,
      price,
      quantity,
      owned,
      needed: quantity,
    });
    return { ok: false, reason: 'not_enough', owned, needed: quantity };
  }

  const removed = await inventory.take(userId, itemCode, quantity);
  if (removed !== quantity) {
    logger.warn('[marketplace.postSale] concurrent_change', {
      userId,
      itemCode,
      price,
      quantity,
      deleted: removed,
    });
    return { ok: false, reason: 'concurrent_change' };
  }

  const meta = await items.getItemMetaByCode(itemCode);
  const name = meta?.name || itemCode;

  const { rows } = await pool.query(
    `INSERT INTO marketplace (id, name, item_code, price, seller, quantity)
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5)
     RETURNING id`,
    [name, itemCode, price, userId, quantity]
  );
  const saleId = rows[0]?.id;

  logger.info('[marketplace.postSale] success', {
    userId,
    itemCode,
    price,
    quantity,
    saleId,
  });
  return { ok: true, saleId, itemCode, price, quantity };
}

// ---------------------------------------------------------------------------
// Listing helpers
// ---------------------------------------------------------------------------

// Render a paginated list of all sales on the marketplace. Returns an embed and
// an array of ActionRows for navigation buttons.
async function createSalesEmbed(page = 1) {
  const perPage = 10;
  let curPage = Math.max(1, Number(page) || 1);
  let offset = (curPage - 1) * perPage;
  let { rows: sales, totalCount } = await listSales({ limit: perPage, offset });
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
  if (curPage > totalPages) {
    curPage = totalPages;
    offset = (curPage - 1) * perPage;
    ({ rows: sales } = await listSales({ limit: perPage, offset }));
  }

  const description = sales
    .map(({ name, item_id, price, quantity, seller }) =>
      `• ${quantity}× ${name} (${item_id}) — ${price ?? 'N/A'} gold — Seller: <@${seller}>`
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
  const perPage = 10;
  let curPage = Math.max(1, Number(page) || 1);
  let offset = (curPage - 1) * perPage;
  let { rows, totalCount } = await listSales({ sellerId: userId, limit: perPage, offset });
  if (rows.length === 0) return 'No sales found.';
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
  if (curPage > totalPages) {
    curPage = totalPages;
    offset = (curPage - 1) * perPage;
    ({ rows } = await listSales({ sellerId: userId, limit: perPage, offset }));
  }

  const description = rows
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
    'SELECT id, name, price, quantity, seller FROM marketplace_v WHERE id = $1',
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

