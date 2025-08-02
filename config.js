const fs = require('fs');
const path = require('path');

// Load local configuration if available
let cfg = {};
const cfgPath = path.join(__dirname, 'config.json');
if (fs.existsSync(cfgPath)) {
  try {
    const localCfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    if (localCfg && typeof localCfg === 'object') {
      Object.assign(cfg, localCfg);
    }
  } catch (err) {
    console.error('Failed to parse config.json:', err);
  }
}

// Environment variables have priority.  Normalize so callers can use either
// upper- or lower-case keys (e.g. `CLIENT_ID` or `clientId`).
const mappings = {
  DISCORD_TOKEN: 'token',
  OPENAI_API_KEY: 'openaiApiKey',
  CLIENT_ID: 'clientId',
  GUILD_ID: 'guildId',
  ADMIN_ID: 'adminId',
};

for (const [envKey, alias] of Object.entries(mappings)) {
  if (process.env[envKey]) {
    cfg[envKey] = process.env[envKey];
    cfg[alias] = process.env[envKey];
  } else if (cfg[alias]) {
    cfg[envKey] = cfg[alias];
  } else if (cfg[envKey]) {
    cfg[alias] = cfg[envKey];
  }
}

module.exports = cfg;
