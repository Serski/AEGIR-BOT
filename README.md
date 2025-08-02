# Merlin Serski

## Configuration

The project uses a small **config.js** helper to manage secrets needed at runtime. The helper first reads values from environment variables and only falls back to an optional `config.json` when a variable is missing. This allows secure deployments while still supporting a simple local setup.

### Priority of settings

Environment variables always take precedence over entries in `config.json`. The JSON file is consulted only for values that are not already provided through the environment.

### Required variables

- `DISCORD_TOKEN` – your bot token
- `CLIENT_ID` – the application/client ID
- `GUILD_ID` – the test server used for slash‑command registration

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
