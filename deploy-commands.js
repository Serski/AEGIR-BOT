const { REST, Routes } = require('discord.js');
// Load credentials from config.js (env vars take priority over config.json)
const { clientId, guildId, token } = require('./config.js');
const fs = require('node:fs');
const path = require('node:path');
const logger = require('./logger');
const keys = require('./db/keys');


async function loadCommands() {
        const commands = [];
        // Grab all the command folders from the commands directory
        const foldersPath = path.join(__dirname, 'commands');
        const commandFolders = fs.readdirSync(foldersPath);

        const commandList = {};

        for (const folder of commandFolders) {
                // Grab all the command files from the commands directory
                const commandsPath = path.join(foldersPath, folder);
                const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

                // Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
                for (const file of commandFiles) {
                        const filePath = path.join(commandsPath, file);
                        const command = require(filePath);
                        if ('data' in command && 'execute' in command) {
                                const json = command.data.toJSON();
                                commands.push(json);
                                commandList[json.name] = {
                                        name: json.name,
                                        description: json.description,
                                        options: json.options || [],
                                        default_member_permissions: json.default_member_permissions,
                                        category: folder,
                                };
                        } else {
                                logger.warn(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
                        }
                }
        }

        await keys.set('commandList', commandList);

	//Also save commandList to a local json
	// fs.writeFileSync('commandList.json', JSON.stringify(commandList, null, 2));

	// Construct and prepare an instance of the REST module
	const rest = new REST().setToken(token);

	// and deploy your commands!
	(async () => {
		logger.info(`Started refreshing ${commands.length} application (/) commands.`);

		logger.debug(clientId, guildId);

		try {
			// The put method is used to fully refresh all commands in the guild with the current set
			const data = await rest.put(
				Routes.applicationGuildCommands(clientId, guildId),
				{ body: commands },
			);

			logger.info(`Successfully reloaded ${data.length} application (/) commands.`);
		} catch (error) {
			logger.error('Failed to reload application (/) commands:', error);
			process.exit(1);
		}
	})();
}

loadCommands();

module.exports = { loadCommands };
