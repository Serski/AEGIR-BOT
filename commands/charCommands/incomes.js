const { SlashCommandBuilder } = require('discord.js');
const characters = require('../../db/characters');
const incomes = require('../../db/incomes');
const clientManager = require('../../clientManager');
const items = require('../../db/items');
const shop = require('../../shop');
const db = require('../../pg-client');

const cooldowns = new Map();

function parseDelay(delay) {
    const match = /^([0-9]+)\s*([a-zA-Z])/.exec(delay || '');
    if (!match) return 24 * 60 * 60 * 1000;
    const amount = Number(match[1]);
    switch (match[2].toLowerCase()) {
        case 'w':
            return amount * 7 * 24 * 60 * 60 * 1000;
        case 'm':
            return amount * 30 * 24 * 60 * 60 * 1000;
        case 'y':
            return amount * 365 * 24 * 60 * 60 * 1000;
        default:
            return amount * 24 * 60 * 60 * 1000;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('incomes')
        .setDescription('Claim all available incomes'),
    async execute(interaction) {
        const userId = await characters.ensureAndGetId(interaction.user);
        const all = await incomes.getAll();
        const userRoles = interaction.member?.roles?.cache?.map(r => r.id) || [];
        const summaries = [];

        for (const inc of all) {
            const required = inc.roles || [];
            if (required.length && !required.some(r => userRoles.includes(r))) continue;

            const delayMs = parseDelay(inc.delay);
            const key = `${userId}:${inc.name}`;
            const last = cooldowns.get(key) || 0;
            if (Date.now() - last < delayMs) continue;

            await db.tx(async t => {
                if (inc.gold_given > 0) {
                    await t.query(
                        `INSERT INTO balances (id, amount)
                         VALUES ($1, $2)
                         ON CONFLICT (id) DO UPDATE SET amount = balances.amount + EXCLUDED.amount`,
                        [userId, inc.gold_given]
                    );
                }
                if (inc.item_code && inc.item_amount > 0) {
                    await t.query(
                        `INSERT INTO inventory_items (instance_id, owner_id, item_id, durability, metadata)
                         SELECT gen_random_uuid()::text, $1, $2, NULL, '{}'::jsonb
                         FROM generate_series(1, $3)`,
                        [userId, inc.item_code, inc.item_amount]
                    );
                }
            });

            cooldowns.set(key, Date.now());

            let line = `${inc.emoji || ''} **${inc.name}**:`;
            const parts = [];
            if (inc.gold_given > 0) {
                parts.push(`${clientManager.getEmoji('Gold')} ${inc.gold_given}`);
            }
            if (inc.item_code && inc.item_amount > 0) {
                const icon = await shop.getItemIcon(inc.item_code);
                const meta = await items.getItemMetaByCode(inc.item_code);
                const itemName = meta ? meta.name : inc.item_code;
                parts.push(`${icon} ${inc.item_amount} ${itemName}`);
            }
            if (parts.length === 0) parts.push('Nothing');
            line += ' ' + parts.join(' ');
            summaries.push(line.trim());
        }

        if (summaries.length === 0) {
            return interaction.reply({ content: 'No incomes available to claim.', ephemeral: true });
        }
        return interaction.reply('Collected:\n' + summaries.join('\n'));
    },
};
