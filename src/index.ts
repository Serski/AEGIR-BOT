import fs from 'node:fs';
import path from 'node:path';
import { Client, GatewayIntentBits, Collection, Events } from 'discord.js';
// @ts-ignore
import logger from '../logger.js';
// @ts-ignore
import interactionHandler from '../interaction-handler.js';
// @ts-ignore
import char from '../char.js';
// @ts-ignore
import dbm from '../database-manager.js';
// @ts-ignore
import '../admin.js';

interface Command {
  data: { name: string };
  execute: (interaction: any) => Promise<void>;
}
interface ExtendedClient extends Client {
  commands: Collection<string, Command>;
}

let token = process.env.DISCORD_TOKEN;
let clientId = process.env.CLIENT_ID;
let guildId = process.env.GUILD_ID;

if (!token || !clientId || !guildId) {
  try {
    // @ts-ignore
    const local = require('../config.js');
    token ??= local.token;
    clientId ??= local.clientId;
    guildId ??= local.guildId;
    logger.info('Using values from local config.js (dev mode)');
  } catch {
    logger.warn(
      '[WARN] No ENV vars found and no local config.js file present. Environment variables take precedence; config.js is optional for development. Set DISCORD_TOKEN / CLIENT_ID / GUILD_ID!'
    );
  }
}

const client: ExtendedClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
}) as ExtendedClient;
client.commands = new Collection();

const foldersPath = path.join(__dirname, '../commands');
const commandFolders = fs.readdirSync(foldersPath);
for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    // @ts-ignore
    const command = require(filePath) as Command;
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
    } else {
      logger.warn(`Command at ${filePath} missing "data" or "execute".`);
    }
  }
}

client.once('ready', () => {
  logger.info(`Logged in as ${client.user?.tag}!`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    try {
      await command?.execute(interaction);
    } catch (err) {
      logger.error(err);
      const reply = { content: 'There was an error while executing this command!', ephemeral: true };
      interaction.replied || interaction.deferred
        ? interaction.followUp(reply)
        : interaction.reply(reply);
    }
  } else {
    interactionHandler.handle(interaction);
  }
});

client.on('guildMemberAdd', member => {
  char.newChar(member.user.tag, member.user.tag, 'A new member of Britannia!', member.id);
});

client.on('guildMemberRemove', member => {
  logger.info('Member left:', member.id);
});

client.on('userUpdate', (oldUser, newUser) => {
  const oldName = oldUser.tag;
  const newName = newUser.tag;
  const data = dbm.loadFile('characters', oldName);
  if (data) {
    dbm.saveFile('characters', newName, data);
    dbm.docDelete('characters', oldName);
  }
});

function botMidnightLoop() {
  const now = new Date();
  const msToMidnight =
    86_400_000 -
    now.getUTCHours() * 3_600_000 -
    now.getUTCMinutes() * 60_000 -
    now.getUTCSeconds() * 1_000 -
    now.getUTCMilliseconds();

  setTimeout(() => {
    char.resetIncomeCD();
    dbm.logData();
    botMidnightLoop();
  }, msToMidnight);
}

botMidnightLoop();
client.login(token!);

export function getClient() { return client; }
export function getGuildID() { return guildId; }
