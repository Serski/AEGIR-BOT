DROP VIEW IF EXISTS marketplace_v;
CREATE VIEW marketplace_v AS
SELECT id, name, item_code AS item_id, price, seller, quantity
FROM marketplace;
