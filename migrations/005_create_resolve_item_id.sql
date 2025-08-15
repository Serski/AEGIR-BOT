CREATE OR REPLACE FUNCTION resolve_item_id(raw TEXT)
RETURNS TEXT AS $$
DECLARE
  result TEXT;
  cnt INTEGER;
BEGIN
  SELECT MIN(id), COUNT(*) INTO result, cnt
    FROM items
    WHERE id = raw OR LOWER(data->>'name') = LOWER(raw);

  IF cnt = 0 THEN
    RAISE EXCEPTION 'No item matches "%"', raw;
  ELSIF cnt > 1 THEN
    RAISE EXCEPTION 'Multiple items match "%". Use an item code.', raw;
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;
