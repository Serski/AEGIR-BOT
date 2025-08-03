const dbm = require('../database-manager');
const { EmbedBuilder } = require('discord.js');

const mapOptions = ["Name", "About", "Channels", "Image", "Emoji"];

async function addMap(mapName, guild, mapType = 'map') {
  let data = await dbm.loadFile('keys', mapType + 's');
  let mapNames = Object.keys(data);
  let i = 1;
  let newMapName = mapName;
  while (mapNames.includes(newMapName)) {
    newMapName = mapName + ' ' + i;
    i++;
  }
  let mapData = {
    mapOptions: mapOptions.reduce((acc, option) => {
      acc[option] = '';
      return acc;
    }, {}),
  };
  mapData.mapOptions.Name = newMapName;
  mapData.mapOptions.Emoji = ':map:';
  data[newMapName] = mapData;
  await dbm.saveFile('keys', mapType + 's', data);
  return newMapName;
}

async function editMapMenu(mapName, tag, mapType = 'map') {
  let mapData = await dbm.loadFile('keys', mapType + 's');
  if (mapData[mapName] == undefined) {
    for (let key in mapData) {
      if (key.toLowerCase() == mapName.toLowerCase()) {
        mapName = key;
        break;
      }
    }
    if (mapData[mapName] == undefined) {
      return 'Map not found!';
    }
  }
  mapData = mapData[mapName];
  let userData = await dbm.loadFile('characters', tag);
  if (!userData.editingFields) {
    userData.editingFields = {};
  }
  userData.editingFields['Map Edited'] = mapName;
  userData.editingFields['Map Type Edited'] = mapType;
  await dbm.saveFile('characters', tag, userData);
  const embed = new EmbedBuilder()
    .setTitle('**' + mapName + '**')
    .setDescription('Edit the fields using the command /editmapfield <field number> <new value>');
  let emoji = mapData.mapOptions.Emoji;
  let valueString = mapOptions.map((option, index) => {
    let value = mapData.mapOptions[option];
    if (index === 1 && value.length > 50) {
      value = 'Too long! Must view in /editembedabout';
    }
    return `\`[${index + 1}] ${option}:\` ` + value;
  }).join('\n');
  embed.addFields({ name: emoji + ' Embed Options', value: valueString });
  embed.setFooter({ text: 'Page 1 of 1, Map Options' });
  return embed;
}

async function removeMap(mapName, mapType = 'map') {
  let data = await dbm.loadFile('keys', mapType + 's');
  if (data[mapName] == undefined) {
    return 'Map not found! Must match the exact name of the map, case sensitive.';
  }
  delete data[mapName];
  await dbm.saveFile('keys', mapType + 's', data);
  return mapName + ' has been deleted';
}

async function editMapAbout(interaction) {
  let infoSection = interaction.customId.replace('editmapaboutmodal', '');
  let mapNameNoSpaces = infoSection.split('||')[0];
  let mapType = infoSection.split('||')[1];
  let maps = await dbm.loadFile('keys', mapType + 's');
  let mapName = Object.keys(maps).find(key => key.replace(/ /g, '').toLowerCase() == mapNameNoSpaces);
  if (mapName == undefined) {
    interaction.reply('Map not found!');
    return;
  }
  let about = interaction.fields.getTextInputValue('mapabout');
  maps[mapName].mapOptions.About = about;
  await dbm.saveFile('keys', mapType + 's', maps);
  interaction.reply('About section has been updated');
}

async function editMapField(charTag, field, value) {
  let charData = await dbm.loadFile('characters', charTag);
  if (!charData.editingFields || !charData.editingFields['Map Edited'] || !charData.editingFields['Map Type Edited']) {
    return 'You must use /editmapmenu first to select a map to edit';
  }
  let data = await dbm.loadFile('keys', charData.editingFields['Map Type Edited'] + 's');
  let mapName = charData.editingFields['Map Edited'];
  let mapType = charData.editingFields['Map Type Edited'];
  if (data[mapName] == undefined) {
    return 'Map not found! Must match the exact name of the map, case sensitive.';
  }
  field = mapOptions[field - 1];
  if (field == undefined) {
    return 'Field not found! Must be a number between 1 and ' + mapOptions.length;
  }
  if (field == 'Channels') {
    let unformattedChannels = value.split('<#');
    let channelString = '';
    for (let i = 0; i < unformattedChannels.length; i++) {
      let channel = unformattedChannels[i];
      if (channel.includes('>')) {
        channelString += '<#' + channel.split('>')[0] + '>';
        if (i < unformattedChannels.length - 1) {
          channelString += ', ';
        }
      }
    }
    if (channelString[channelString.length - 1] == ',') {
      channelString = channelString.slice(0, -1);
    }
    value = channelString;
  }
  if (field == 'Name') {
    if (data[value] != undefined) {
      return 'Map name already exists!';
    }
    data[value] = data[mapName];
    delete data[mapName];
    mapName = value;
  }
  data[mapName].mapOptions[field] = value;
  await dbm.saveFile('keys', mapType + 's', data);
  if (value == '') {
    return 'Field ' + field + ' has been removed';
  }
  return 'Field ' + field + ' has been updated to ' + value;
}

async function allMaps() {
  let maps = await dbm.loadFile('keys', 'maps');
  let mapNames = Object.keys(maps).map(key => maps[key].mapOptions.Emoji + ' **' + key + '**').join('\n');
  let embed = new EmbedBuilder().setTitle('All Maps').setDescription(mapNames);
  return embed;
}

async function allGuides() {
  let guides = await dbm.loadFile('keys', 'guides');
  let mapNames = Object.keys(guides).map(key => guides[key].mapOptions.Emoji + ' **' + key + '**').join('\n');
  let embed = new EmbedBuilder().setTitle('All Guides').setDescription(mapNames);
  return embed;
}

async function allLores() {
  let lores = await dbm.loadFile('keys', 'lores');
  let mapNames = Object.keys(lores).map(key => lores[key].mapOptions.Emoji + ' **' + key + '**').join('\n');
  let embed = new EmbedBuilder().setTitle('All Lores').setDescription(mapNames);
  return embed;
}

async function allRanks() {
  let ranks = await dbm.loadFile('keys', 'ranks');
  let mapNames = Object.keys(ranks).map(key => ranks[key].mapOptions.Emoji + ' **' + key + '**').join('\n');
  let embed = new EmbedBuilder().setTitle('All Ranks').setDescription(mapNames);
  return embed;
}

async function map(mapName, channelId, type = 'map') {
  let maps = await dbm.loadFile('keys', type + 's');
  let mapObj = maps[mapName];
  while (mapObj == undefined) {
    for (const key in maps) {
      if (key.toLowerCase().replace(/ /g, '') == mapName.toLowerCase().replace(/ /g, '')) {
        mapObj = maps[key];
        mapName = key;
      }
    }
    if (mapObj == undefined) {
      return 'Map not found!';
    }
  }
  if (mapObj.mapOptions.Channels != '') {
    let channels = mapObj.mapOptions.Channels.split('<#');
    let channelIDs = channels.map(channel => channel.split('>')[0]);
    if (!channelIDs.includes(channelId)) {
      return 'This map is not available in this channel!';
    }
  }
  let embed;
  if (mapObj.mapOptions.Emoji != '') {
    embed = new EmbedBuilder().setTitle(mapObj.mapOptions.Emoji + ' ' + mapName);
  } else {
    embed = new EmbedBuilder().setTitle(mapName);
  }
  if (mapObj.mapOptions.About != '') {
    embed.setDescription(mapObj.mapOptions.About);
  }
  if (mapObj.mapOptions.Image != '') {
    embed.setImage(mapObj.mapOptions.Image);
  }
  let typeName = type.charAt(0).toUpperCase() + type.slice(1);
  embed.setFooter({ text: typeName + ' of ' + mapName });
  return embed;
}

module.exports = {
  addMap,
  editMapMenu,
  removeMap,
  editMapAbout,
  editMapField,
  allMaps,
  allGuides,
  allLores,
  allRanks,
  map,
};
