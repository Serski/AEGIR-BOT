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
const char               = require('./char');
const dbm                = require('./database-manager');
const admin              = require('./admin');

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
    const command  = require(filePath);
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
    } else {
      logger.warn(`Command at ${filePath} missing "data" or "execute".`);
    }
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
  await char.newChar(
    member.user.tag,
    member.user.tag,
    'A new member of Britannia!',
    member.id
  );
});

client.on('guildMemberRemove', member => {
  logger.info('Member left:', member.id);
});

client.on('userUpdate', async (oldUser, newUser) => {
  const oldName = oldUser.tag;
  const newName = newUser.tag;
  const data = await dbm.loadFile('characters', oldName);
  if (data) {
    await dbm.saveFile('characters', newName, data);
    await dbm.docDelete('characters', oldName);
  }
});

function botMidnightLoop() {
  const now = new Date();
  const msToMidnight =
    86_400_000 -
    now.getUTCHours()    * 3_600_000 -
    now.getUTCMinutes()  *    60_000 -
    now.getUTCSeconds()  *     1_000 -
    now.getUTCMilliseconds();

  setTimeout(() => {
    char.resetIncomeCD();
    dbm.logData();
    botMidnightLoop();
  }, msToMidnight);
}
botMidnightLoop();

// ───── Login & exports ─────────────────────────────────────────
client.login(token);

function getClient()   { return client;   }
function getGuildID()  { return guildId;  }

module.exports = { getClient, getGuildID };
