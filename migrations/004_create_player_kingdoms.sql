BEGIN;

CREATE TABLE IF NOT EXISTS player_kingdoms (
  role_id TEXT PRIMARY KEY
);

INSERT INTO player_kingdoms (role_id)
SELECT jsonb_array_elements_text(data->'list')
FROM keys
WHERE id = 'playerKingdoms'
ON CONFLICT (role_id) DO NOTHING;

DELETE FROM keys WHERE id = 'playerKingdoms';

COMMIT;
