const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const characters = require('../../db/characters');
const inventory = require('../../db/inventory');
const db = require('../../pg-client');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('inventory')
		.setDescription('Show your inventory'),
        async execute(interaction) {
        const charId = await characters.ensureAndGetId(interaction.user);
        const rows = await inventory.getInventoryView(charId);

        const embed = new EmbedBuilder().setTitle('Inventory').setColor(0x36393e);

        const itemIds = [...new Set(rows.map((r) => r.item_id))];
        let iconMap = {};
        if (itemIds.length > 0) {
                const { rows: iconRows } = await db.query(
                `SELECT id, COALESCE(data->>'icon', data->'infoOptions'->>'Icon', '') AS icon
                   FROM items
                  WHERE id = ANY($1)`,
                [itemIds]
                );
                for (const r of iconRows) {
                iconMap[r.id] = r.icon || '';
                }
        }

        const inventoryMap = {};
        for (const row of rows) {
                const catLower = (row.category || '').toLowerCase();
                if (catLower === 'ships' || catLower === 'ship' || catLower === 'resources' || catLower === 'resource') {
                continue;
                }
                const category = row.category || 'Misc';
                if (!inventoryMap[category]) inventoryMap[category] = [];
                inventoryMap[category].push({
                item: row.name,
                qty: Number(row.quantity),
                icon: iconMap[row.item_id] || '',
                });
        }

        const categories = Object.keys(inventoryMap).sort();
        if (categories.length === 0) {
                embed.setDescription('No items in inventory!');
                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
        }

        let descriptionText = '';
        for (const category of categories) {
                let endSpaces = '-';
                if (20 - category.length - 2 > 0) {
                endSpaces = '-'.repeat(20 - category.length - 2);
                }
                descriptionText += `**\`--${category}${endSpaces}\`**\n`;
                descriptionText += inventoryMap[category]
                .map(({ item, qty, icon }) => {
                        let alignSpaces = ' ';
                        if (30 - item.length - ('' + qty).length > 0) {
                        alignSpaces = ' '.repeat(30 - item.length - ('' + qty).length);
                        }
                        return `${icon} \`${item}${alignSpaces}${qty}\``;
                })
                .join('\n');
                descriptionText += '\n';
        }

        embed.setDescription('**Items:** \n' + descriptionText);
        await interaction.reply({ embeds: [embed], ephemeral: true });
        },
};
