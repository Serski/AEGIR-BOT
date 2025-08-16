/**
 * AEGIR-BOT ─ runtime configuration
 * ---------------------------------
 *  • In production (Railway, etc.) supply ENV vars:
 *      DISCORD_TOKEN   – your bot token
 *      CLIENT_ID       – the application / client ID
 *      GUILD_ID        – the test-server ID (for slash-command registration)
 *
 *  • In local dev you can drop a `config.js` helper next to this file:
 *      module.exports = { token:"...", clientId:"...", guildId:"..." };
 *    Environment variables always take precedence over the local file.
 */

const fs   = require('node:fs');
const path = require('node:path');
const { Client, GatewayIntentBits, Collection, Events } = require('discord.js');
const logger             = require('./logger');

// ────────────────────────────────────────────────────────────────
// 1) Load secrets from ENV, else fall back to optional ./config.js
// ────────────────────────────────────────────────────────────────
let token   = process.env.DISCORD_TOKEN;
let clientId = process.env.CLIENT_ID;
let guildId  = process.env.GUILD_ID;

if (!token || !clientId || !guildId) {
  try {
    const local = require('./config.js');
    token    ||= local.token;
    clientId ||= local.clientId;
    guildId  ||= local.guildId;
    logger.info('Using values from local config.js (dev mode)');
  } catch {
    logger.warn(
      '[WARN] No ENV vars found and no local config.js file present. ' +
      'Environment variables take precedence; config.js is optional for development. ' +
      'Set DISCORD_TOKEN / CLIENT_ID / GUILD_ID!'
    );
  }
}

if (!token || !clientId || !guildId) {
  const missing = [
    !token && 'DISCORD_TOKEN',
    !clientId && 'CLIENT_ID',
    !guildId && 'GUILD_ID',
  ].filter(Boolean).join(', ');
  throw new Error(`Missing required environment variables: ${missing}`);
}
// ────────────────────────────────────────────────────────────────

// other module imports
const Discord           = require('discord.js');
const interactionHandler = require('./interaction-handler');
const db                 = require('./pg-client');
const admin              = require('./admin');
const characters         = require('./db/characters');
const items             = require('./db/items');
const inventory         = require('./db/inventory');

// create and configure the client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
});

// ───── Command loader ───────────────────────────────────────────
client.commands = new Collection();
const foldersPath   = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const cmd = require(filePath);
    if (typeof cmd?.data?.name !== 'string' || typeof cmd?.execute !== 'function') {
      console.warn(`[WARNING] Skipping ${filePath}; exports:`, cmd ? Object.keys(cmd) : 'NO EXPORTS');
      continue;
    }
    client.commands.set(cmd.data.name, cmd);
  }
}

// ───── Ready event ──────────────────────────────────────────────
client.once('ready', () => {
  logger.info(`Logged in as ${client.user.tag}!`);
});

// ───── Interaction handler ─────────────────────────────────────
client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command || typeof command.execute !== 'function') {
      console.warn(`[warn] command ${interaction.commandName} missing execute()`);
      return interaction
        .reply({ ephemeral: true, content: "Sorry, that command isn't available right now." })
        .catch(() => {});
    }
    try {
      await command.execute(interaction);
    } catch (err) {
      logger.error(err);
      const reply = { content: 'There was an error while executing this command!', ephemeral: true };
      interaction.replied || interaction.deferred
        ? interaction.followUp(reply)
        : interaction.reply(reply);
    }
  } else {
    await interactionHandler.handle(interaction);
  }
});

// ───── Guild member events, midnight loop, etc. ────────────────
client.on('guildMemberAdd', async member => {
  const user = member.user;
  const charId = await characters.ensureAndGetId(user);
  const data = {
    name: user.tag,
    bio: 'A new member of Britannia!',
    ships: {},
    incomeList: {},
    incomeAvailable: true,
    stats: {
      Martial: 0,
      Intrigue: 0,
      Prestige: 0,
      Devotion: 0,
      Legitimacy: 0,
    },
    shireID: 0,
    numeric_id: user.id,
  };
  await db.query(
    `UPDATE characters SET data = $2 WHERE id = $1`,
    [charId, data]
  );
  await db.query(
    `INSERT INTO balances (id, amount) VALUES ($1, 200)
     ON CONFLICT (id) DO NOTHING`,
    [charId]
  );
  const tokenId = await items.resolveItemCode('Adventure Token');
  await inventory.give(charId, tokenId, 1);
});

client.on('guildMemberRemove', member => {
  logger.info('Member left:', member.id);
});

client.on('userUpdate', async (oldUser, newUser) => {
  const oldName = oldUser.tag;
  const newName = newUser.tag;
  await db.query('UPDATE characters SET id=$1 WHERE id=$2', [newName, oldName]);
});

function botMidnightLoop() {
  const now = new Date();
  const msToMidnight =
    86_400_000 -
    now.getUTCHours()    * 3_600_000 -
    now.getUTCMinutes()  *    60_000 -
    now.getUTCSeconds()  *     1_000 -
    now.getUTCMilliseconds();

  setTimeout(async () => {
    try {
      await db.query(
        `UPDATE characters
            SET data = jsonb_set(COALESCE(data, '{}'::jsonb), '{incomeAvailable}', 'true', true)`
      );
      logger.debug('legacy logData skipped');
    } catch (err) {
      logger.error('Midnight loop error:', err);
    } finally {
      botMidnightLoop();
    }
  }, msToMidnight);
}
botMidnightLoop();

// ───── Login & exports ─────────────────────────────────────────
async function start() {
  try {
    await client.login(token);
  } catch (err) {
    logger.error('Failed to login:', err);
    process.exit(1);
  }
}
start();

function getClient()   { return client;   }
function getGuildID()  { return guildId;  }

module.exports = { getClient, getGuildID };
