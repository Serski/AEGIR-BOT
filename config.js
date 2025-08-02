const fs = require('fs');
const path = require('path');

let config = {};
const configPath = path.join(__dirname, 'config.json');

if (fs.existsSync(configPath)) {
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    config = JSON.parse(raw);
  } catch (err) {
    console.error('Failed to read config.json:', err);
  }
}

module.exports = {
  clientId: process.env.CLIENT_ID || config.clientId,
  guildId: process.env.GUILD_ID || config.guildId,
  token: process.env.DISCORD_TOKEN || config.token,
  gptToken: process.env.GPT_TOKEN || config.gptToken,
};
