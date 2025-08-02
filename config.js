// Central configuration module
// Exposes common configuration values read from environment variables or local config.json

let openaiKey = process.env.OPENAI_API_KEY;

if (!openaiKey) {
  try {
    const local = require('./config.json');
    // Support both new and legacy property names
    openaiKey = local.openaiKey || local.gptToken;
  } catch {
    // No local config file found
  }
}

module.exports = {
  openaiKey,
};
