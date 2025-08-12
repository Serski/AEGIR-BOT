BEGIN;

-- Drop existing inventory structures
DROP VIEW IF EXISTS v_inventory;
DROP TABLE IF EXISTS inventory_items;
DROP TABLE IF EXISTS inventories;
DROP TABLE IF EXISTS items;

-- Item definitions with enforced category
CREATE TABLE items (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    data JSONB
);

-- Stacked items
CREATE TABLE inventories (
    owner_id TEXT NOT NULL,
    item_id  TEXT NOT NULL,
    qty      INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (owner_id, item_id),
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

-- Individual item instances
CREATE TABLE inventory_items (
    instance_id TEXT PRIMARY KEY,
    owner_id    TEXT NOT NULL,
    item_id     TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    durability  INTEGER,
    metadata    JSONB
);

-- Unified inventory view
CREATE VIEW v_inventory AS
    SELECT i.owner_id,
           i.item_id,
           i.qty,
           NULL::TEXT    AS instance_id,
           NULL::INTEGER AS durability,
           NULL::JSONB   AS metadata,
           it.category
      FROM inventories i
      JOIN items it ON i.item_id = it.id
    UNION ALL
    SELECT ii.owner_id,
           ii.item_id,
           1 AS qty,
           ii.instance_id,
           ii.durability,
           ii.metadata,
           it.category
      FROM inventory_items ii
      JOIN items it ON ii.item_id = it.id;

COMMIT;
