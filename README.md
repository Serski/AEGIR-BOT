# Merlin Serski

## Configuration

The project uses a small **config.js** helper to manage secrets needed at runtime. The helper first reads values from environment variables and only falls back to an optional `config.json` when a variable is missing. This allows secure deployments while still supporting a simple local setup.

### Priority of settings

Environment variables always take precedence over entries in `config.json`. The JSON file is consulted only for values that are not already provided through the environment.

### Required variables

- `DISCORD_TOKEN` – your bot token
- `CLIENT_ID` – the application/client ID
- `GUILD_ID` – the test server used for slash‑command registration
- `DATABASE_URL` – PostgreSQL connection string (Railway sets this automatically)

### Optional variables

The PostgreSQL pool can be tuned via:

- `PGPOOL_MAX` – maximum number of connections
- `PGPOOL_MIN` – minimum number of idle connections
- `PGPOOL_IDLE` – idle timeout in milliseconds
- `PGPOOL_CLIENT_TIMEOUT` – connection timeout in milliseconds

### Setting environment variables

**Bash / Linux / macOS**
```bash
export DISCORD_TOKEN="abcdef"
export CLIENT_ID="1234567890"
export GUILD_ID="0987654321"
npm run deploy
```

**Windows PowerShell**
```powershell
$env:DISCORD_TOKEN="abcdef"
$env:CLIENT_ID="1234567890"
$env:GUILD_ID="0987654321"
npm run deploy
```

You can also provide them inline for a one‑off command:
```bash
DISCORD_TOKEN=abcdef CLIENT_ID=1234567890 GUILD_ID=0987654321 node bot.js
```
On Railway, configure these variables in the project settings. Adding a PostgreSQL service will supply `DATABASE_URL`, and you may
set `PGPOOL_*` variables to adjust connection pooling.

## /panel command

Use `/panel` to open a personal control panel. The response is ephemeral and visible only to the invoking user. The panel features a select menu with:

- **Inventory** – view your inventory.
- **Resources** – view stored resources.
- **Ships** – view your ships and cargo.
- **Back** – return to the main panel.

Inventory, resource storage, and ship views support pagination. Use the `<` and `>` buttons to move between pages.

## /sell command

Use `/sell` to list an inventory item for sale on the marketplace. Provide an item code or name (item codes avoid ambiguity). Quantity defaults to 1 and price defaults to 0.

