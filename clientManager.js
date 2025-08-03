const logger = require('./logger');
class clientManager {
    static getEmoji(emojiName) {
        const bot = require('./bot');

        //Remove spaces
        emojiName = emojiName.replace(/\s/g, '');
        const client = bot.getClient();
        const guildId = bot.getGuildID();
        if (!client) {
            logger.warn("Client not found");
            return null;
        }
        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            logger.warn("Guild not found");
            return null;
        }
        const foundEmoji = guild.emojis.cache?.find(emoji => emoji.name.toLowerCase() === emojiName.toLowerCase());
        if (!foundEmoji) {
            logger.warn("Emoji not found");
            return null;
        }
        return `<:${foundEmoji.name}:${foundEmoji.id}>`;
    }

    static async getUser(userID) {
        const bot = require('./bot');
        const client = bot.getClient();
        const guildId = bot.getGuildID();
        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            logger.warn("Guild not found");
            return null;
        }
        const foundUser = await guild.members.fetch(userID);
        if (!foundUser) {
            logger.warn("User not found");
            return null;
        }
        return foundUser;
    }
    
}

module.exports = clientManager;
