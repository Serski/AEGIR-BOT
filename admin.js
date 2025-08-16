const keys = require('./db/keys');
const kingdoms = require('./db/kingdoms');
const axios = require('axios');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, createWebhook, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const shop = require('./shop');
const clientManager = require('./clientManager');
const logger = require('./logger');
const incomes = require('./db/incomes');
const items = require('./db/items');
const characters = require('./db/characters');
const editing = require('./db/editing-fields');

const mapOptions = ["Name", "About", "Channels", "Image", "Emoji"]

class Admin {

  static async initShireSelect(channel, kingdom) {
    let kingdoms = await keys.get("kingdoms");
    //Capitalize the first letter of the kingdom
    kingdom = kingdom.charAt(0).toUpperCase() + kingdom.slice(1);
    let shires = kingdoms[kingdom].shires;

    if (shires == undefined) {
      return "Kingdom not found!";
    }

    let shireNames = Object.keys(shires).map(key => "- " + clientManager.getEmoji("Town") + " " + shires[key].name).join("\n");

    let changed = false;

    //Each shire should have a name and a roleCode. If the roleCode is not found, it should be created.
    for (const shire in shires) {
      let role = channel.guild.roles.cache.find(role => role.name === shires[shire].name);
      logger.debug(`Role: ${role}`);
      if (role == undefined) {
        logger.info("New Role");
        role = await channel.guild.roles.create({
          name: shires[shire].name,
          color: '#FFFFFF',
          reason: 'Added role for shire from initShireSelect command',
        });
        shires[shire].roleCode = role.id;
        changed = true;
      } else if (shires[shire].roleCode == undefined || shires[shire].roleCode != role.id) {
        shires[shire].roleCode = role.id;
        changed = true;
      }
    }

    //Each kingdom should have a role to match its name. If one is not found, it should be created.
    let role = channel.guild.roles.cache.find(role => role.name === kingdom);
    if (role == undefined) {
      role = await channel.guild.roles.create({
        name: kingdom,
        color: '#FFFFFF',
        reason: 'Added role for kingdom from initShireSelect command',
      });
      kingdoms[kingdom].roleCode = role.id;
      changed = true;
    } else if (kingdoms[kingdom].roleCode == undefined || kingdoms[kingdom].roleCode != role.id) {
      kingdoms[kingdom].roleCode = role.id;
      changed = true;
    }

    //Send an embed with the title Massalia and the text Capital: Massalia \n The city has the following colonies \n and than a list of the colonies. There will also be a menu you can click to choose which colony. The colonies will come out of the shires.json file.
    let embed = new EmbedBuilder()
      .setDescription("# " + clientManager.getEmoji(kingdom) + " " + kingdom +
        "\n- Capital: :star: " + kingdoms[kingdom].capital +
        "\n- This kingdom contains the following shires: " +
        "\n \u200B----------------------------------------" +
        "\n" + shireNames)
      .setFooter({ text: 'Select a shire below to join', iconURL: 'https://images-ext-1.discordapp.net/external/zNN-s-f41tPGzag5FxItzlLKuLKnAXiirTy3ke0nG-k/https/cdn.discordapp.com/emojis/620697454928723971.gif' })
      .setImage(kingdoms[kingdom].image);
    let select = new StringSelectMenuBuilder().setCustomId('shireSelect').setPlaceholder('Select a shire to join');
    //Add a select menu option for each city in the keys table
    Object.keys(shires).forEach(shire => {
      select.addOptions({
        label: shires[shire].name,
        value: kingdom + "||" + shire
      });
    });

    let actionRow = new ActionRowBuilder().addComponents(select);

    if (changed == true) {
      kingdoms[kingdom].shires = shires;
      await keys.set("kingdoms", kingdoms);
    }
    
    await channel.send({ embeds: [embed], components: [actionRow] });

    return "Select menu set!";
  }

  static async initTradeNodeSelect(channel) {
    let tradeNodes = await keys.get("tradeNodes");
    //TradeNodes is a map of trade node names to trade node objects, where each trade node object has a name, and list of items that can be traded there, as well as a role code for the trade node. The role code may be blank, in which case it must be found.
    //Ex. trade node: " - <polis emoji> North Sea Waters - <Item1> <Item1Emoji>, <Item2> <Item2Emoji>"

    let tradeNodeNames = await Promise.all(
      Object.keys(tradeNodes).map(async key => {
        let itemsWithIcons = await Promise.all(
            tradeNodes[key].items.map(async item => {
                let icon = await shop.getItemIcon(item);
                return `${item} ${icon}`;
            })
        );
        return ` - ${clientManager.getEmoji("Polis")} ${tradeNodes[key].name} - ${itemsWithIcons.join(", ")}`;
      })
    );
  
    tradeNodeNames = tradeNodeNames.join("\n");
  
    //Send an embed with the title Trade Nodes of Massalia and the text The following trade nodes are available to trade in: and than a list of the trade nodes. There will also be a menu you can click to choose which trade node. The trade nodes will come out of the tradeNodes.json file.
    let embed = new EmbedBuilder()
      .setDescription("# " + clientManager.getEmoji("Massalia") + " Trade Node Selection" +
        "\n- Within the trade menu, you are afforded the opportunity to select only one (1) trade region to engage with. " +
        "\n- Eligibility for selection requires possession of the 'Trade Ship' role, symbolizing your maritime commercial capabilities." +
        "\n- Upon selection, you will be granted exclusive access to a specialized trade channel. This channel is a marketplace for unique resources and items, specific to your chosen trade region." +
        "\n- You can change your trade node by buying and using the item **Node Nullifier**" +
        "\n- To initiate your trade region selection, utilize the menu provided below." +
        "\n" + tradeNodeNames)
      .setFooter({ text: 'Select a trade node below to trade in', iconURL: 'https://images-ext-1.discordapp.net/external/zNN-s-f41tPGzag5FxItzlLKuLKnAXiirTy3ke0nG-k/https/cdn.discordapp.com/emojis/620697454928723971.gif' })
      .setImage('https://cdn.discordapp.com/attachments/1248563504772808736/1248646054384111707/Screenshot_2024-06-07_at_5.25.35_PM.png?ex=66646bc2&is=66631a42&hm=8a14092809ec776cc44e8950bd6b7f81f236d6c077d2bc91089dbfc0d5bc30bf&');

    let select = new StringSelectMenuBuilder().setCustomId('tradeNodeSelect').setPlaceholder('Select a trade node to trade in');
    //Add a select menu option for each trade node in the tradeNodes.json file
    Object.keys(tradeNodes).forEach(tradeNode => {
      select.addOptions({
        label: tradeNodes[tradeNode].name,
        value: tradeNode
      });
    });

    let actionRow = new ActionRowBuilder().addComponents(select);

    await channel.send({ embeds: [embed], components: [actionRow] });
  }

  static async initResourceSelect(channel) {
    let resources = await keys.get("resources");
    //Resources is a map of resource names to resource objects, where each resource object has a name, emoji, political stance and motto
    let resourceNames = Object.keys(resources).map(key => "- " + resources[key].emoji + " " + resources[key].name + " - " + resources[key].description).join("\n");
    //Send an embed with the title Resources of the Realm and the text The following resources are available to join: and than a list of the resources. There will also be a menu you can click to choose which resource. The resources will come out of the resources.json file.

    let guild = channel.guild;
    
    for (const resource in resources) {
      let role = guild.roles.cache.find(role => role.name === resources[resource].name);
      if (role == undefined) {
        role = await guild.roles.create({
          name: resources[resource].name,
          color: '#FFFFFF',
          reason: 'Added role for resource from selectResource command',
        });
  
        resources[resource].roleCode = role.id;
        await keys.set("resources", resources);
      } else if (role.id != resource.roleCode) {
        resources[resource].roleCode = role.id;
        await keys.set("resources", resources);
      }
    }
      
    let embed = new EmbedBuilder()
      .setDescription("# Resources" +
        "\n- You can choose from one of the following resources: " +
        "\n \u200B----------------------------------------" +
        "\n" + resourceNames)
      .setFooter({ text: 'Select a resource below to join', iconURL: 'https://images-ext-1.discordapp.net/external/zNN-s-f41tPGzag5FxItzlLKuLKnAXiirTy3ke0nG-k/https/cdn.discordapp.com/emojis/620697454928723971.gif' })
      .setImage('https://cdn.discordapp.com/attachments/1244030279199359077/1244034376757547070/Screenshot_2024-05-26_at_12.08.12_AM.png?ex=66544d8c&is=6652fc0c&hm=afbdf2cfd0776ca95946ddfc2a5cb4d3cf57b6f166b8623896bd873dc9ad0eae&');

    let select = new StringSelectMenuBuilder().setCustomId('resourceSelect').setPlaceholder('Select a resource to join');
    //Add a select menu option for each resource in the resources.json file
    Object.keys(resources).forEach(resource => {
      select.addOptions({
        label: resources[resource].name,
        value: resource
      });
    });

    let actionRow = new ActionRowBuilder().addComponents(select);

    await channel.send({ embeds: [embed], components: [actionRow] });
  }

  static async initClassSelect(channel) {
    //Classes is just a simple array containing two values, "Landowner" and "Trader"
    let classes = ["Landowner", "Trader"];
    //Class text box should be as follows:
    /**
     * **Choose Your Starting Class**
This is an era of opportunity for the ambitious. Begin your journey as a humble landowner or a modest trader.

<:Wheat:1231881265062613053>  Landowner class: Unique resource Wheat - Used mainly for troops.

<:Wine:1212160493989400586>  Trader class: Unique resource  Wine-versatile resource



When selected grants the:

<@&1331650035628380241> and <@&1331613719385477140> 

<@&1331650287877886073>  role and <@&1331613468897579130>
     */
    //Send an embed with the title Resources of the Realm and the text The following resources are available to join: and than a list of the resources. There will also be a menu you can click to choose which resource. The resources will come out of the resources.json file.

    //Set up text box properly, using client manager.getEmoji to get the emojis for the resources and  grabbing roles from names (Landowner and Landowner Base Role, Trader and Trader Base Role).

    let embedText = "# Choose Your Starting Class" +
      "\n This is an era of opportunity for the ambitious. Begin your journey as a humble landowner or a modest trader." +
      "\n \u200B----------------------------------------" +
      "\n" + clientManager.getEmoji("Wheat") + "  Landowner class: Unique resource Wheat - Used mainly for troops." +
      "\n \u200B----------------------------------------" +
      "\n" + clientManager.getEmoji("Wine") + "  Trader class: Unique resource  Wine-versatile resource" +
      "\n\nWhen selected grants the:" +
      "\n<@&1331650035628380241> and <@&1331613719385477140>" +
      "\n<@&1331650287877886073> and <@&1331613468897579130>";
      

    let embed = new EmbedBuilder()
      .setDescription(embedText)
      .setFooter({ text: 'Select a class below', iconURL: 'https://images-ext-1.discordapp.net/external/zNN-s-f41tPGzag5FxItzlLKuLKnAXiirTy3ke0nG-k/https/cdn.discordapp.com/emojis/620697454928723971.gif' })
      .setImage('https://cdn.discordapp.com/attachments/1244030279199359077/1244034376757547070/Screenshot_2024-05-26_at_12.08.12_AM.png?ex=66544d8c&is=6652fc0c&hm=afbdf2cfd0776ca95946ddfc2a5cb4d3cf57b6f166b8623896bd873dc9ad0eae&');

    let select = new StringSelectMenuBuilder().setCustomId('classSelect').setPlaceholder('Select a class');
    //Add a select menu option for each resource in the resources.json file
    classes.forEach(cl => {
      select.addOptions({
        label: cl,
        value: cl
      });
    });
    let actionRow = new ActionRowBuilder().addComponents(select);

    await channel.send({ embeds: [embed], components: [actionRow] });
  }

  static async initPartySelect(channel) {
    let parties = await keys.get("parties");
    //Parties is a map of party names to party objects, where each party object has a name, emoji, political stance, roleID, motto and banner. All of that is irrelevant for this one, as we're just using the banner with a button underneath saying "Join [partyname]" for each party, i.e. multiple embeds and buttons

    for (const party in parties) {
      let partyData = parties[party];
      let embed = new EmbedBuilder()
        .setDescription("# " + partyData.emoji + " " + partyData.name + " (" + partyData.stance + ")" + 
          "\n> " + partyData.motto +
          "\n\n**Formation:** " + partyData.formation +
          "\n**Ideology:** " + partyData.ideology +
          "\n**Political Influence:** " + partyData.politicalInfluence)
        .setImage(partyData.banner);
      let button = new ButtonBuilder()
        .setCustomId('partySelect' + party)

        .setLabel('Join ' + partyData.name)
        .setStyle(ButtonStyle.Secondary);
      let actionRow = new ActionRowBuilder().addComponents(button);
      await channel.send({ embeds: [embed], components: [actionRow] });
    }
  }

  static async addShire(shireName, resource, guild) {
    logger.info(`Adding shire ${shireName} with resource ${resource}`);
    let shires = await keys.get("shires");
    resource = await shop.findItemName(resource);
    if (resource == "ERROR") {
      return "Item not found";
    }
    if (shires[shireName] != undefined) {
      if (shires[shireName].resource == resource) {
        return "Shire already exists";
      }
    }
    let roleID = "ERROR"
    if (guild.roles.cache.find(role => role.name === shireName) != undefined) {
      roleID = guild.roles.cache.find(role => role.name === shireName).id;
    } else {
      await guild.roles.create({
        name: shireName,
        color: '#FFFFFF',
        reason: 'Added role for shire from addshire command',
      }).then(role => {
        logger.info("Role created");
        roleID = role.id;  // This will log the newly created role's ID
      }).catch(logger.error);
    }
    let shire = {
      name: shireName,
      resource: resource,
      resourceCode: await shop.getItemIcon(resource),
      roleCode: roleID
    };
    shires[shireName] = shire;
    await keys.set("shires", shires);

    return "Shire " + shireName + " has been added with resource " + resource;
  }

  //addMap adds a new map to data, should be similar to addRecipe NOT to addShire
  static async addMap(mapName, guild, mapType = "map") {
    // Load the maps collection
    let data = await keys.get(mapType + 's');
    let mapNames = Object.keys(data);
    let i = 1;
    let newMapName = mapName;
  
    // Ensure the map name is unique by appending a number if necessary
    while (mapNames.includes(newMapName)) {
      newMapName = mapName + " " + i;
      i++;
    }
  
    // Create a new map object with all fields blank
    let mapData = {
      "mapOptions": mapOptions.reduce((acc, option) => {
        acc[option] = "";
        return acc;
      }, {}),
    };
    mapData.mapOptions.Name = newMapName;
    mapData.mapOptions.Emoji = ":map:";

    data[newMapName] = mapData;
  
    // Save the new map to the maps collection
    await keys.set(mapType + 's', data); 
  
    return newMapName;
  }

  static async editMapMenu(mapName, tag, mapType = "map") {
    // Load the map data
    let mapData = await keys.get(mapType + 's');
  
    if (mapData[mapName] == undefined) {
      for (let key in mapData) {
        if (key.toLowerCase() == mapName.toLowerCase()) {
          mapName = key;
          break;
        }
      }
      if (mapData[mapName] == undefined) {
        return "Map not found!";
      }
    }
  
    mapData = mapData[mapName];
  
    let editingFields = await editing.get(tag);
    if (!editingFields) {
      editingFields = {};
    }
    editingFields["Map Edited"] = mapName;
    editingFields["Map Type Edited"] = mapType;
    await editing.set(tag, editingFields);
  
    // Construct the edit menu embed
    const embed = new EmbedBuilder()
      .setTitle("**" + mapName + "**")
      .setDescription('Edit the fields using the command /editmapfield <field number> <new value>');
    
    let emoji = mapData.mapOptions.Emoji;

    let valueString = mapOptions.map((option, index) => {
      let value = mapData.mapOptions[option];
      
      // If index is 1 and value is too long, replace it
      if (index === 1 && value.length > 50) {
          value = "Too long! Must view in /editembedabout";
      }
  
      return `\`[${index + 1}] ${option}:\` ` + value;
  }).join('\n');
  
  
    // Add fields for Map Options
    embed.addFields({ name: emoji + ' Embed Options', value: valueString });
    embed.setFooter({ text: 'Page 1 of 1, Map Options' });
  
    // Return the embed
    return embed;
  }

  static async removeMap(mapName, mapType = "map") {
    // Load the maps collection
    let data = await keys.get(mapType + 's');
    if (data[mapName] == undefined) {
      return "Map not found! Must match the exact name of the map, case sensitive."
    }
  
    // Delete the map from the collection
    delete data[mapName];
  
    // Save the updated collection
    await keys.set(mapType + 's', data);
  
    return mapName + ' has been deleted';
  }

  static async editMapAbout(interaction) {
    let infoSection = interaction.customId.replace("editmapaboutmodal", "");
    let mapNameNoSpaces = infoSection.split("||")[0];
    let mapType = infoSection.split("||")[1];
    let maps = await keys.get(mapType + 's');
    let mapName = Object.keys(maps).find(key => key.replace(/ /g, '').toLowerCase() == mapNameNoSpaces);
    if (mapName == undefined) {
      interaction.reply("Map not found!");
      return;
    }
    logger.debug(interaction);
    let about = interaction.fields.getTextInputValue('mapabout');

    maps[mapName].mapOptions.About = about;
    await keys.set(mapType + 's', maps);
    interaction.reply("About section has been updated");
  }
  
  static async editMapField(charTag, field, value) {
    // Load the maps collection
    let editingFields = await editing.get(charTag);
    if (!editingFields || !editingFields["Map Edited"] || !editingFields["Map Type Edited"]) {
      return "You must use /editmapmenu first to select a map to edit";
    }
    let data = await keys.get(editingFields["Map Type Edited"] + 's');
    let mapName = editingFields["Map Edited"];
    let mapType = editingFields["Map Type Edited"];
    if (data[mapName] == undefined) {
      return "Map not found! Must match the exact name of the map, case sensitive."
    }

    //Field is a number, so we need to convert it to the actual field name
    field = mapOptions[field - 1];
    if (field == undefined) {
      return "Field not found! Must be a number between 1 and " + mapOptions.length
    }
    //If field is 3, make sure that its in the format <#channel1> <#channel2> etc.
    if (field == "Channels") {
      let unformattedChannels = value.split("<#");
      let channelString = "";
      //Make sure every channel has a > at the end. For any channel that has one, add it formatted with a comma to the channelString
      for (let i = 0; i < unformattedChannels.length; i++) {
        let channel = unformattedChannels[i];
        if (channel.includes(">")) {
          channelString += "<#" + channel.split(">")[0] + ">";
          if (i < unformattedChannels.length - 1) {
            channelString += ", ";
          }
        }
      }
      //If final character is a comma, remove it
      if (channelString[channelString.length - 1] == ",") {
        channelString = channelString.slice(0, -1);
      }
      value = channelString;
    }

    //If field is name, make sure it is unique and than update the map name
    if (field == "Name") {
      if (data[value] != undefined) {
        return "Map name already exists!";
      }
      data[value] = data[mapName];
      delete data[mapName];
      mapName = value;
    }
  
    // Update the field with the new value
    data[mapName].mapOptions[field] = value;
  
    // Save the updated collection
    await keys.set(mapType + 's', data);

    if (value == "") {
      return 'Field ' + field + ' has been removed';
    }
  
    return 'Field ' + field + ' has been updated to ' + value;
  }

  static async allMaps() {
    let maps = await keys.get("maps");
    //Create an embed with the title ":map: All Maps", and than the description is a list of all maps in the form <Emoji> **<MapName>**
    let mapNames = Object.keys(maps).map(key => maps[key].mapOptions.Emoji + " **" + key + "**").join("\n");
    let embed = new EmbedBuilder()
      .setTitle("All Maps")
      .setDescription(mapNames);

    return embed;
  }

  static async allGuides() {
    let guides = await keys.get("guides");
    let mapNames = Object.keys(guides).map(key => guides[key].mapOptions.Emoji + " **" + key + "**").join("\n");
    let embed = new EmbedBuilder()
      .setTitle("All Guides")
      .setDescription(mapNames);

    return embed;
  }

  static async allLores() {
    let lores = await keys.get("lores");
    let mapNames = Object.keys(lores).map(key => lores[key].mapOptions.Emoji + " **" + key + "**").join("\n");
    //Iterate over each value, log emoji + " " + key
    for (const key in lores) {
      logger.debug(lores[key]);
    }
    let embed = new EmbedBuilder()
      .setTitle("All Lores")
      .setDescription(mapNames);

    return embed;
  }

  static async allRanks() {
    let ranks = await keys.get("ranks");
    let mapNames = Object.keys(ranks).map(key => ranks[key].mapOptions.Emoji + " **" + key + "**").join("\n");
    let embed = new EmbedBuilder()
      .setTitle("All Ranks")
      .setDescription(mapNames);

    return embed;
  }

  static async map(mapName, channelId, type = "map") {
    let maps = await keys.get(type + "s");
    let map = maps[mapName];
    while (map == undefined) {
      for (const key in maps) {
        if (key.toLowerCase().replace(/ /g, '') == mapName.toLowerCase().replace(/ /g, '')) {
          map = maps[key];
          mapName = key;
        }
      }
      if (map == undefined) {
        return "Map not found!";
      }
    }

    if (map.mapOptions.Channels != "") {
      //Check if channelId is a channel in the map
      let channels = map.mapOptions.Channels.split("<#");
      let channelIDs = channels.map(channel => channel.split(">")[0]);
      if (!channelIDs.includes(channelId)) {
        return "This map is not available in this channel!";
      }
    }

    let embed;
    if (map.mapOptions.Emoji != "") {
      embed = new EmbedBuilder().setTitle(map.mapOptions.Emoji + " " + mapName);
    } else {
      embed = new EmbedBuilder().setTitle(mapName);
    }
    if (map.mapOptions.About != "") {
      embed.setDescription(map.mapOptions.About);
    }
    if (map.mapOptions.Image != "") {
      embed.setImage(map.mapOptions.Image);
    }
    //Typename
    let typeName = type.charAt(0).toUpperCase() + type.slice(1);

    embed.setFooter({ text: typeName + ' of ' + mapName });
  
    return embed;
  }
  

  static async selectShire(interaction) {
    const selectedShire = interaction.values[0].split("||")[1];
    const selectedKingdom = interaction.values[0].split("||")[0];
    let kingdoms = await keys.get("kingdoms");
    let shires = kingdoms[selectedKingdom].shires;
    let shire = shires[selectedShire];

    let guild = interaction.guild;
    let user = await guild.members.fetch(interaction.user.id);

    let userTag = interaction.user.tag;
    let char = await characters.load(userTag);
    //add all shires from all kingdoms to a new tempShires object
    let tempShires = {};
    for (const kingdom in kingdoms) {
      Object.assign(tempShires, kingdoms[kingdom].shires);
    }

    //Sort through user roles, see if they have any that match the shire roles. If they do, return an error message
    for (const role of user.roles.cache) {
      if (Object.values(tempShires).some(shire => shire.roleCode == role[1].id)) {
        await interaction.reply({ content: "You are already a member of a shire! You cannot switch shires", ephemeral: true });
        return;
      }
    }

    const playerKingdoms = await kingdoms.list();

    logger.debug(playerKingdoms);

    //playerKingdoms is an array of role IDs
    for (const role of user.roles.cache) {
      if (playerKingdoms.includes(role[1].id)) {
        await interaction.reply({ content: "You are already a member of a player kingdom! You cannot switch to a bot kingdom", ephemeral: true });
        return;
      }
    }
      

    //shire.roleCode is the role ID of the shire. If it doesn't exist, create it. First, check for a role with that rolecode. DO not first check for a role that matches by name, first check for a role that matches by ID
    let role = guild.roles.cache.find(role => role.id === shire.roleCode);
    if (role == undefined) {
      role = await guild.roles.create({
        name: shire.name,
        color: '#FFFFFF',
        reason: 'Added role for shire from selectShire command',
      });

      shire.roleCode = role.id;
      shires[selectedShire] = shire;
      kingdoms[selectedKingdom].shires = shires;
      await keys.set("kingdoms", kingdoms);
    }

    let kingdomRole = guild.roles.cache.find(role => role.id === kingdoms[selectedKingdom].roleCode);
    if (kingdomRole == undefined) {
      kingdomRole = await guild.roles.create({
        name: selectedKingdom,
        color: '#FFFFFF',
        reason: 'Added role for kingdom from selectShire command',
      });

      kingdoms[selectedKingdom].roleCode = kingdomRole.id;
      await keys.set("kingdoms", kingdoms);
    }

    await user.roles.add(role);
    await user.roles.add(kingdomRole);
    await characters.save(userTag, char);


    await interaction.reply({ 
      content: "You have selected " + shire.name + " as your shire",
      ephemeral: true 
    });
  }

  static async selectTradeNode(interaction) {
    const selectedTradeNode = interaction.values[0];
    let tradeNodes = await keys.get("tradeNodes");
    let tradeNode = tradeNodes[selectedTradeNode];

    let guild = interaction.guild;
    let user = await guild.members.fetch(interaction.user.id);

    let userTag = interaction.user.tag;
    let char = await characters.load(userTag);
    for (const role of user.roles.cache) {
      if (Object.values(tradeNodes).some(tradeNode => tradeNode.roleCode == role[1].id)) {
        await interaction.reply({ content: "You are already a member of a trade node! You cannot switch trade nodes", ephemeral: true });
        return;
      }
    }

    let role = guild.roles.cache.find(role => role.name === tradeNode.name);
    if (role == undefined) {
      role = await guild.roles.create({
        name: tradeNode.name,
        color: '#FFFFFF',
        reason: 'Added role for trade node from selectTradeNode command',
      });

      tradeNode.roleCode = role.id;
      tradeNodes[selectedTradeNode] = tradeNode;
      await keys.set("tradeNodes", tradeNodes);
    }

    await user.roles.add(role);
    char.tradeNodeID = selectedTradeNode;
    await characters.save(userTag, char);

    await interaction.reply({ 
      content: "You have selected " + tradeNode.name + " as your trade node", 
      ephemeral: true 
    });
  }

  static async selectResource(interaction) {
    const selectedResource = interaction.values[0];
    let resources = await keys.get("resources");
    let resource = resources[selectedResource];

    let guild = interaction.guild;
    let user = await guild.members.fetch(interaction.user.id);

    let userTag = interaction.user.tag;
    let char = await characters.load(userTag);
    for (const role of user.roles.cache) {
      if (Object.values(resources).some(resource => resource.roleCode == role[1].id)) {
        await interaction.reply({ content: "You are already a producer of a resource! You cannot switch resources", ephemeral: true });
        return;
      }
    }

    let role = guild.roles.cache.find(role => role.name === resource.name);
    if (role == undefined) {
      role = await guild.roles.create({
        name: resource.name,
        color: '#FFFFFF',
        reason: 'Added role for resource from selectResource command',
      });

      resource.roleCode = role.id;
      resources[selectedResource] = resource;
      await keys.set("resources", resources);
    }

    await user.roles.add(role);
    char.resourceID = selectedResource;
    await characters.save(userTag, char);

    await interaction.reply({ 
      content: "You have selected " + resource.emoji + resource.name, 
      ephemeral: true 
    });
  }

  static async selectClass(interaction) {
    const selectedClass = interaction.values[0];
    let guild = interaction.guild;
    let user = await guild.members.fetch(interaction.user.id);

    let classRoleName;
    let classBaseRoleName;
    if (selectedClass == "Landowner") {
      classRoleName = "Farmer";
      classBaseRoleName = "Landowner Base Role";
    } else if (selectedClass == "Trader") {
      classRoleName = "Trader";
      classBaseRoleName = "Trader Base Role";
    }

    let userTag = interaction.user.tag;
    let char = await characters.load(userTag);
    for (const role of user.roles.cache) {
      if (role[1].name == "Trader" || role[1].name == "Farmer") {
        await interaction.reply({ content: "You are already a member of a class! You cannot switch classes", ephemeral: true });
        return;
      }
    }

    let classRole = guild.roles.cache.find(role => role.name === classRoleName);
    if (classRole == undefined) {
      classRole = await guild.roles.create({
        name: classRoleName,
        color: '#FFFFFF',
        reason: 'Added role for class from selectClass command',
      });
    }

    let classBaseRole = guild.roles.cache.find(role => role.name === classBaseRoleName);
    if (classBaseRole == undefined) {
      classBaseRole = await guild.roles.create({
        name: classBaseRoleName,
        color: '#FFFFFF',
        reason: 'Added base role for class from selectClass command',
      });
    }

    await user.roles.add(classRole);
    await user.roles.add(classBaseRole);
    
    await interaction.reply({
      content: "You have selected " + selectedClass + " as your class",
      ephemeral: true
    });
  }

  static async selectParty(interaction) {
    const selectedParty = interaction.customId.replace("partySelect", "");
    let parties = await keys.get("parties");
    let party = parties[selectedParty];

    let guild = interaction.guild;
    let user = await guild.members.fetch(interaction.user.id);

    let userTag = interaction.user.tag;
    let char = await characters.load(userTag);
    for (const role of user.roles.cache) {
      if (Object.values(parties).some(party => party.name.toLowerCase() == role[1].name.toLowerCase())) {
        await interaction.reply({ content: "You are already a member of a party! You cannot switch parties", ephemeral: true });
        return;
      }
    }

    let role = guild.roles.cache.find(role => role.name.toLowerCase() === party.name.toLowerCase());
    if (role == undefined) {
      logger.error("ERROR! THIS IS A PROBLEM!");
    }

    await user.roles.add(role);
    char.partyID = selectedParty;
    await characters.save(userTag, char);

    await interaction.reply({ 
      content: "You have selected " + party.emoji + party.name + "\n\n" + party.motto, 
      ephemeral: true 
    });

    //Send welcome message to the party channel
    let partyChatID = party.chatID;
    let partyChat = guild.channels.cache.get(partyChatID);
    let userPing = "<@" + user.id + ">";
    await partyChat.send("Welcome to " + party.emoji + party.name + ", " + userPing + "!");
  }

  static async addKingdom(kingdomRole) {
    const roleID = kingdomRole.id;
    const existing = await kingdoms.fetch(roleID);
    if (existing) {
      return "Player kingdom already exists";
    }
    await kingdoms.insert(roleID);
    return "Player kingdom " + kingdomRole.name + " added";
  }

  static async listKingdoms() {
    const list = await kingdoms.list();
    if (!list.length) {
      return "No player kingdoms found";
    }
    let kingdomNames = list.map(roleID => "<@&" + roleID + ">").join("\n");
    let embed = new EmbedBuilder()
      .setTitle("Player Kingdoms")
      .setDescription(kingdomNames);
    return embed;
  }

  static async generalHelpMenu(page, isAdminMenu) {
    page = Number(page);
    let folderToHelp = ""

    let embed = new EmbedBuilder()
      .setDescription("Use /help <command> to get help with a specific command");

    switch (page) {
      case 1:
        folderToHelp = "charCommands";
        embed.setTitle("Character Commands" + (isAdminMenu ? " (Admin)" : ""));
        break;
      case 2:
        folderToHelp = "shopCommands";
        embed.setTitle("Shop Commands" + (isAdminMenu ? " (Admin)" : ""));
        break;
      case 3:
        folderToHelp = "salesCommands";
        embed.setTitle("Sales Commands" + (isAdminMenu ? " (Admin)" : "")); 
        break;
      case 4:
        folderToHelp = "adminCommands";
        embed.setTitle("Admin Commands" + (isAdminMenu ? " (Admin)" : ""));
        break;
    }

    const commandList = await keys.get('commandList') || {};
    for (const [name, command] of Object.entries(commandList)) {
      if (command.category === folderToHelp) {
        const isAdmin = (command.default_member_permissions === 0);
        if (isAdmin === isAdminMenu) {
          let description = command.description || "";
          embed.addFields({ name: "/" + name, value: description });
        }
      }
    }

    const rows = [];
    // Create a "Previous Page" button
    let baseID = 'switch_help';
    if (isAdminMenu) {
      baseID += 'A';
      embed.setFooter({ text: 'Page ' + page + ' of ' + 4 });
    } else {
      baseID += 'R';
      embed.setFooter({ text: 'Page ' + page + ' of ' + 3 });
    }

    let prevID = baseID;
    if (page === 1) {
      if (isAdminMenu) {
        prevID += 4;
      } else {
        prevID += 3;
      }
    } else {
      prevID += page - 1;
    }

    const prevButton = new ButtonBuilder()
      .setCustomId(prevID)
      .setLabel('<')
      .setStyle(ButtonStyle.Secondary); // You can change the style to your preference

    let nextID = baseID;
    if (page === 4) { 
      if (isAdminMenu) {
        nextID += 1;
      }
    } else if (page === 3 && !isAdminMenu) {
      nextID += 1;
    } else {
      nextID += page + 1;
    }

    const nextButton = new ButtonBuilder()
          .setCustomId(nextID)
          .setLabel('>')
          .setStyle(ButtonStyle.Secondary); // You can change the style to your preference

    rows.push(new ActionRowBuilder().addComponents(prevButton, nextButton));

    return [embed, rows];
  }

  static async commandHelp(commandName) {
    //Send an embed with the title, description, options and "help" field of the command. Options should be horizontally aligned. Read from keys/commandList in firebase.
    let commandList = await keys.get("commandList");
    let command = commandList[commandName];
    if (command == undefined) {
      for (const cmd in commandList) {
        if (cmd.toLowerCase() == commandName.toLowerCase()) {
          command = commandList[cmd];
          commandName = cmd;
        }
      }
      if (command == undefined) {
        return null;
      }
    }
    let embed = new EmbedBuilder()
      .setDescription("## :hammer: </" + commandName + "> command");
    let options = command.options;
    embed.addFields({ name: "Basic Description: ", value: command.description, inline: false });
    //Options will be a bunch of inline field values, i.e. no optionstring will be made
    let optionsAdded = false;
    for (const option in options) {
      if (!optionsAdded) {
        embed.addFields({ name: "Options: ", value: " ", inline: false });
        optionsAdded = true;
      }
      embed.addFields({ name: "<" + option + ">", value: options[option], inline: true });
    }
    embed.addFields({ name: "Full info:", value: command.help });

    return embed;
  }

  static async addIncome(role, incomeString) {
    const roleID = role.id;
    const roleName = role.name;

    const fields = {
      delay: '1D',
      gold_given: 0,
      item_id: null,
      item_amount: 0,
      emoji: clientManager.getEmoji('Gold'),
      roles: [roleID],
    };

    const parts = incomeString.trim().split(/\s+/);
    if (parts.length === 1) {
      const gold = parseInt(parts[0]);
      if (isNaN(gold)) {
        return 'Income must be a number or "[amount] [item]"';
      }
      fields.gold_given = gold;
    } else {
      const amount = parseInt(parts.shift());
      if (isNaN(amount)) {
        return 'Item amount must be a number';
      }
      const itemTerm = parts.join(' ');
      let itemCode;
      try {
        itemCode = await items.resolveItemCode(itemTerm);
      } catch {
        return 'Item not found';
      }
      fields.item_id = itemCode;
      fields.item_amount = amount;
    }

    await incomes.add(roleName, fields);

    return 'Income added: ' + incomeString + ' income under name ' + roleName + ' <@&' + roleID + '>';
  }

  static async allIncomes(page = 1) {
    const maxLength = 10;
    const incomeRows = await incomes.getAll();
    if (incomeRows.length === 0) {
      return 'No incomes found';
    }

    const goldList = [];
    const itemList = [];
    const miscList = [];
    for (const row of incomeRows) {
      const gold = row.gold_given || 0;
      const item = row.item_id || '';
      const amount = row.item_amount || 0;
      if (gold > 0 && item === '' && amount === 0) {
        goldList.push(row);
      } else if (gold === 0 && item !== '' && amount > 0) {
        itemList.push(row);
      } else {
        miscList.push(row);
      }
    }

    goldList.sort((a, b) => a.gold_given - b.gold_given);
    itemList.sort((a, b) => a.item_id.localeCompare(b.item_id) || a.item_amount - b.item_amount);

    const sorted = goldList.concat(itemList).concat(miscList);
    const incomeEntries = [];
    for (const row of sorted) {
      const emoji = row.emoji;
      const delay = row.delay && row.delay !== '' ? row.delay : '1D';
      const roles = row.roles || [];
      const rolesString = roles.length > 0 ? '<@&' + roles.join('>, <@&') + '>' : '';
      let givenString = '';
      if (row.gold_given > 0) {
        givenString += clientManager.getEmoji('Gold') + ' ' + row.gold_given + ' ';
      }
      if (row.item_id && row.item_amount) {
        const icon = await shop.getItemIcon(row.item_id);
        const meta = await items.getItemMetaByCode(row.item_id);
        const itemName = meta ? meta.name : row.item_id;
        givenString += icon + ' ' + row.item_amount + ' ' + itemName;
      }
      const entry = emoji + ' `' + delay + '` ' + '**' + row.name + '**: ' + rolesString + ' ' + givenString + '\n';
      incomeEntries.push(entry);
    }

    const totalPages = Math.ceil(incomeEntries.length / maxLength);
    page = Math.max(1, Math.min(page, totalPages));
    const start = (page - 1) * maxLength;
    const end = start + maxLength;

    const paginatedIncomes = incomeEntries.slice(start, end).join('');
    const returnEmbed = new EmbedBuilder().setTitle('Incomes')
      .setDescription(paginatedIncomes)
      .setFooter({ text: `Page ${page} of ${totalPages}` });

    const actionRow = new ActionRowBuilder();
    const prevButton = new ButtonBuilder()
      .setCustomId('switch_inco' + (page - 1))
      .setLabel('Previous')
      .setStyle(ButtonStyle.Secondary);
    const nextButton = new ButtonBuilder()
      .setCustomId('switch_inco' + (page + 1))
      .setLabel('Next')
      .setStyle(ButtonStyle.Secondary);
    if (page <= 1) {
      prevButton.setDisabled(true);
    }
    if (page >= totalPages) {
      nextButton.setDisabled(true);
    }
    actionRow.addComponents(prevButton, nextButton);

    return [returnEmbed, [actionRow]];
  }

  static async editIncomeMenu(income, charTag) {
    const rows = await incomes.getAll();
    let incomeValue = rows.find(r => r.name.toLowerCase() === income.toLowerCase());
    if (!incomeValue) {
      return 'Income not found';
    }
    income = incomeValue.name;
    const roles = incomeValue.roles || [];
    const rolesString = roles.length > 0 ? '<@&' + roles.join('>, <@&') + '>' : '';
    let delayString = '';
    if (!incomeValue.delay || incomeValue.delay === '') {
      delayString = '1 Day';
      await incomes.update(income, { delay: '1D' });
      incomeValue.delay = '1D';
    } else {
      const delayAmount = incomeValue.delay.match(/\d+/g);
      const delayUnit = incomeValue.delay.match(/[A-Za-z]+/g);
      delayString = '' + delayAmount;
      switch (delayUnit[0].toLowerCase()) {
        case 'd':
          delayString += ' Day';
          break;
        case 'w':
          delayString += ' Week';
          break;
        case 'm':
          delayString += ' Month';
          break;
        case 'y':
          delayString += ' Year';
          break;
      }
      if (delayAmount > 1) {
        delayString += 's';
      }
    }
    let itemName = '';
    if (incomeValue.item_id) {
      const meta = await items.getItemMetaByCode(incomeValue.item_id);
      itemName = meta ? meta.name : incomeValue.item_id;
    }
    const returnEmbed = new EmbedBuilder()
      .setTitle('Income: ' + income)
      .setDescription(
        '`[1] Name:         ` ' + income +
        '\n`[2] Emoji:        ` ' + (incomeValue.emoji || '') +
        '\n`[3] Roles:        ` ' + rolesString +
        '\n`[4] Gold Given:   ` ' + (incomeValue.gold_given || 0) +
        '\n`[5] Item Given:   ` ' + itemName +
        '\n`[6] Amount Given: ` ' + (incomeValue.item_amount || 0) +
        '\n`[7] Income Delay: ` ' + delayString
      );

    let editingFields = await editing.get(charTag);
    if (!editingFields) {
      editingFields = {};
    }
    editingFields['Income Edited'] = income;
    await editing.set(charTag, editingFields);

    return returnEmbed;
  }

  static async editIncomeField(fieldNumber, charTag, newValue) {
    const editingFields = await editing.get(charTag);
    let income = editingFields ? editingFields['Income Edited'] : undefined;
    const rows = await incomes.getAll();
    const incomeValue = rows.find(r => r.name === income);
    if (!incomeValue) {
      return 'Income not found';
    }
    switch (fieldNumber) {
      case 1:
        if (newValue === 'DELETEFIELD') {
          await incomes.remove(income);
          return 'Income ' + income + ' deleted';
        }
        await incomes.update(income, { name: newValue });
        if (editingFields) {
          editingFields['Income Edited'] = newValue;
          await editing.set(charTag, editingFields);
        }
        return 'Field 1 changed to ' + newValue;
      case 2:
        if (newValue === 'DELETEFIELD') {
          newValue = clientManager.getEmoji('Gold');
        }
        await incomes.update(income, { emoji: newValue });
        break;
      case 3:
        if (newValue === 'DELETEFIELD') {
          await incomes.update(income, { roles: [] });
          break;
        }
        const roles = newValue.match(/<@&\d+>/g);
        if (roles == null) {
          return 'No roles found';
        }
        const roleIDs = roles.map(role => role.substring(3, role.length - 1));
        await incomes.update(income, { roles: roleIDs });
        break;
      case 4:
        if (newValue === 'DELETEFIELD') {
          await incomes.update(income, { gold_given: 0 });
          break;
        }
        const gold = parseInt(newValue);
        if (isNaN(gold)) {
          return 'Gold must be a number';
        }
        await incomes.update(income, { gold_given: gold });
        break;
      case 5:
        if (newValue === 'DELETEFIELD') {
          await incomes.update(income, { item_id: null, item_amount: 0 });
          break;
        }
        let itemCode;
        try {
          itemCode = await items.resolveItemCode(newValue);
        } catch {
          return 'Item not found';
        }
        await incomes.update(income, { item_id: itemCode });
        break;
      case 6:
        if (newValue === 'DELETEFIELD') {
          await incomes.update(income, { item_amount: 0 });
          break;
        }
        const amount = parseInt(newValue);
        if (isNaN(amount)) {
          return 'Amount must be a number';
        }
        await incomes.update(income, { item_amount: amount });
        break;
      case 7:
        if (newValue === 'DELETEFIELD') {
          await incomes.update(income, { delay: '1D' });
          break;
        }
        const delaySplit = newValue.split(' ');
        if (delaySplit.length !== 2) {
          return 'Invalid delay format- must be [Number] [Unit], i.e. 1 d, 1 w, 1 m, 1 y, or 1 day, 1 week, 1 month, 1 year';
        }
        const delayAmount = parseInt(delaySplit[0]);
        if (isNaN(delayAmount)) {
          return "Delay amount must be a number, and the number must be first. i.e. '1 Day' or '1 d' is acceptable, but 'daily' or 'd 1' is not.";
        }
        const delayUnit = delaySplit[1];
        let adjustedUnit = '';
        switch (delayUnit.toLowerCase()) {
          case 'day':
          case 'days':
          case 'd':
            adjustedUnit = 'D';
            break;
          case 'week':
          case 'weeks':
          case 'w':
            adjustedUnit = 'W';
            break;
          case 'month':
          case 'months':
          case 'm':
            adjustedUnit = 'M';
            break;
          case 'year':
          case 'years':
          case 'y':
            adjustedUnit = 'Y';
            break;
          default:
            return 'Invalid delay unit- must be day/days/d, week/weeks/w, month/months/m, or year/years/y. The unit must be second, i.e. 1 day';
        }
        await incomes.update(income, { delay: delayAmount + adjustedUnit });
        break;
      default:
        return 'Field not found';
    }
    return 'Field ' + fieldNumber + ' changed to ' + newValue;
  }
}

module.exports = Admin;
