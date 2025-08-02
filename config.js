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

// Environment variables have priority
const keys = ['DISCORD_TOKEN', 'OPENAI_API_KEY', 'CLIENT_ID', 'GUILD_ID', 'ADMIN_ID'];
for (const key of keys) {
  if (process.env[key]) {
    cfg[key] = process.env[key];
  }
}

module.exports = cfg;
