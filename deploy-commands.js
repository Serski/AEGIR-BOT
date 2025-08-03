const { REST, Routes } = require('discord.js');
// Load credentials from config.js (env vars take priority over config.json)
const { clientId, guildId, token } = require('./config.js');
const fs = require('node:fs');
const path = require('node:path');
const dbm = require('./database-manager');
const logger = require('./logger');


async function loadCommands() {
	const commands = [];
	// Grab all the command folders from the commands directory you created earlier
	const foldersPath = path.join(__dirname, 'commands');
	const commandFolders = fs.readdirSync(foldersPath);

        // this will store metadata for the help command
        let commandList = {};


	for (const folder of commandFolders) {
		// Grab all the command files from the commands directory you created earlier
		const commandsPath = path.join(foldersPath, folder);
		const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

		//Count command files, print, and than break
		let count = 0;
		for (const file of commandFiles) {
			count++;
		}
		// Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
                for (const file of commandFiles) {
                        // Add this command to the list of commands with fields "description", "options" and "help"
                        const filePath = path.join(commandsPath, file);
                        const command = require(filePath);
                        if ('data' in command && 'execute' in command) {
                                commands.push(command.data.toJSON());

                                // build a metadata object for the help system
                                const options = {};
                                if (Array.isArray(command.data.options)) {
                                        for (const option of command.data.options) {
                                                options[option.name] = option.description ?? '';
                                        }
                                }

                                commandList[command.data.name] = {
                                        description: command.data.description ?? '',
                                        options,
                                        help: command.help ?? command.data.description ?? ''
                                };
                        } else {
                                logger.warn(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
                        }
                }
        }

        // save commandList both to the database and locally
        try {
                await dbm.saveFile('keys', 'commandList', commandList);
                fs.writeFileSync(path.join(__dirname, 'commandList.json'), JSON.stringify(commandList, null, 2));
                logger.info('Command list saved successfully.');
        } catch (err) {
                logger.error('Failed to save command list:', err);
        }

	// Construct and prepare an instance of the REST module
	const rest = new REST().setToken(token);

	// and deploy your commands!
	(async () => {
		
			logger.info(`Started refreshing ${commands.length} application (/) commands.`);

			logger.debug(clientId, guildId);

			// The put method is used to fully refresh all commands in the guild with the current set
			const data = await rest.put(
				Routes.applicationGuildCommands(clientId, guildId),
				{ body: commands },
			);

			logger.info(`Successfully reloaded ${data.length} application (/) commands.`);
		
	})();
}

loadCommands();

module.exports = { loadCommands };
