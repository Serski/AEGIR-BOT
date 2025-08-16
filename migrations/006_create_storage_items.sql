CREATE TABLE storage_items (
    owner_id TEXT NOT NULL,
    item_id  TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (owner_id, item_id)
);
