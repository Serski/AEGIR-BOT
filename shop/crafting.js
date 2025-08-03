const dbm = require('../database-manager');
const Discord = require('discord.js');
const shop = require('../shop');

const recipeOptions = [
  'Name', 'Icon', 'Show Image', 'Show Message',
  'Ingredient 1', 'Ingredient 2', 'Ingredient 3', 'Ingredient 4', 'Ingredient 5', 'Ingredient 6', 'Ingredient 7', 'Ingredient 8', 'Ingredient 9', 'Ingredient 10',
  'Result 1', 'Result 2', 'Result 3', 'Result 4', 'Result 5',
  'Craft Time in Hours (#)', 'Need None Of Roles', 'Need All Of Roles', 'Need Any Of Roles', 'Is Public (Y/N)'
];

async function addRecipe(recipeName) {
  let data = await dbm.loadCollection('recipes');
  let shopData = await dbm.loadCollection('shop');
  let recipeNames = Object.keys(data);
  let i = 1;
  let newRecipeName = recipeName;
  while (recipeNames.includes(newRecipeName)) {
    newRecipeName = recipeName + ' ' + i;
    i++;
  }
  let recipeData = {
    recipeOptions: recipeOptions.reduce((acc, option) => {
      acc[option] = '';
      return acc;
    }, {}),
  };
  recipeData.recipeOptions['Is Public (Y/N)'] = 'No';
  let itemName = await shop.findItemName(newRecipeName, shopData);
  if (itemName != 'ERROR') {
    let itemData = shopData[itemName];
    newRecipeName = itemName;
    recipeData.recipeOptions.Name = itemName;
    recipeData.recipeOptions.Icon = itemData.infoOptions.Icon;
    recipeData.recipeOptions['Result 1'] = '1 ' + itemName;
  } else {
    recipeData.recipeOptions.Name = newRecipeName;
    recipeData.recipeOptions.Icon = ':hammer:';
  }
  recipeData.recipeOptions['Craft Time in Hours (#)'] = 1;
  await dbm.saveFile('recipes', newRecipeName, recipeData);
  return newRecipeName;
}

async function recipesEmbed(isPublic, page) {
  const itemsPerPage = 1000;
  let data = await dbm.loadCollection('recipes');
  let shopData = await dbm.loadCollection('shop');
  let publicRecipes = [];
  let privateRecipes = [];
  for (let [key, value] of Object.entries(data)) {
    if (value.recipeOptions['Is Public (Y/N)'] == 'Yes') {
      publicRecipes.push(value);
    } else {
      privateRecipes.push(value);
    }
  }
  let recipesToShow = isPublic ? publicRecipes : publicRecipes.concat(privateRecipes);
  let categorizedRecipes = {};
  let itemNamesLower = Object.keys(shopData).map(name => name.toLowerCase());
  for (let recipe of recipesToShow) {
    let category = 'Uncategorized';
    if (shopData[recipe.recipeOptions.Name]) {
      category = shopData[recipe.recipeOptions.Name].infoOptions.Category || category;
    } else {
      let recipeName = recipe.recipeOptions.Name.toLowerCase();
      let index = itemNamesLower.indexOf(recipeName);
      if (index != -1) {
        category = shopData[Object.keys(shopData)[index]].infoOptions.Category || category;
      }
    }
    if (category == '') {
      category = 'Uncategorized';
    }
    if (!categorizedRecipes[category]) {
      categorizedRecipes[category] = [];
    }
    categorizedRecipes[category].push(recipe);
  }
  const pageStart = (page - 1) * itemsPerPage;
  const pageEnd = pageStart + itemsPerPage;
  const totalPages = Math.ceil(recipesToShow.length / itemsPerPage);
  let returnEmbed = new Discord.EmbedBuilder()
    .setTitle(':hammer: Recipes')
    .setColor(0x36393e)
    .setFooter({ text: `Page ${page} of ${totalPages}` });
  let descriptionText = '';
  const addRecipesToDescription = (recipes, startIndex, endIndex, category, isPublicList) => {
    if (recipes.length > 0) {
      descriptionText += `**${category}**\n`;
      for (let i = startIndex; i < endIndex && i < recipes.length; i++) {
        let recipeName = recipes[i].recipeOptions.Name;
        if (!isPublic && privateRecipes.includes(recipes[i])) {
          recipeName += ' :warning:';
        }
        descriptionText += (recipes[i].recipeOptions.Icon ? recipes[i].recipeOptions.Icon + ' ' : ':hammer: ') + recipeName + '\n';
      }
    }
  };
  let count = 0;
  for (let [category, recipes] of Object.entries(categorizedRecipes)) {
    if (count >= pageStart && count < pageEnd) {
      let startIndex = Math.max(pageStart - count, 0);
      let endIndex = Math.min(pageEnd - count, recipes.length);
      addRecipesToDescription(recipes, startIndex, endIndex, category, isPublic);
    }
    count += recipes.length;
  }
  if (descriptionText === '') {
    descriptionText = 'No recipes found!';
  }
  returnEmbed.setDescription(descriptionText);
  const prevButton = new Discord.ButtonBuilder()
    .setCustomId('prev_page')
    .setLabel('<')
    .setStyle(Discord.ButtonStyle.Secondary)
    .setDisabled(page === 1);
  const nextButton = new Discord.ButtonBuilder()
    .setCustomId('next_page')
    .setLabel('>')
    .setStyle(Discord.ButtonStyle.Secondary)
    .setDisabled(page === totalPages);
  let actionRow = new Discord.ActionRowBuilder().addComponents(prevButton, nextButton);
  return [returnEmbed, actionRow];
}

async function editRecipeMenu(recipeName, tag) {
  let recipeData = await dbm.loadCollection('recipes', recipeName);
  if (recipeData[recipeName] == undefined) {
    for (let key in recipeData) {
      if (key.toLowerCase() == recipeName.toLowerCase()) {
        recipeName = key;
        break;
      }
    }
    if (recipeData[recipeName] == undefined) {
      return 'Recipe not found!';
    }
  }
  recipeData = recipeData[recipeName];
  let userData = await dbm.loadCollection('characters');
  if (!userData[tag].editingFields) {
    userData[tag].editingFields = {};
  }
  userData[tag].editingFields['Recipe Edited'] = recipeName;
  await dbm.saveCollection('characters', userData);
  const embed = new Discord.EmbedBuilder()
    .setTitle('**' + recipeName + '**')
    .setDescription('Edit the fields using the command /editrecipefield <field number> <new value>');
  embed.addFields({ name: '📜 Recipe Options', value: recipeOptions.map((option, index) => `\`[${index + 1}] ${option}:\` ` + recipeData.recipeOptions[option]).join('\n') });
  embed.setFooter({ text: 'Page 1 of 1, Recipe Options' });
  return embed;
}

async function editRecipeField(userTag, fieldNumber, newValue) {
  let userData = await dbm.loadCollection('characters');
  let recipeName;
  if (!userData[userTag].editingFields['Recipe Edited']) {
    return 'You are not currently editing any recipes!';
  } else {
    recipeName = userData[userTag].editingFields['Recipe Edited'];
  }
  let recipeData = await dbm.loadFile('recipes', recipeName);
  let shopData = await dbm.loadCollection('shop');
  let category;
  if (fieldNumber >= 1 && fieldNumber <= recipeOptions.length) {
    category = 'recipeOptions';
  } else {
    return 'Invalid field number!';
  }
  let fieldName;
  switch (category) {
    case 'recipeOptions':
      fieldName = recipeOptions[fieldNumber - 1];
      break;
  }
  if (category === 'recipeOptions' && fieldName.includes('Ingredient')) {
    let ingredientName = newValue.split(' ').slice(1).join(' ');
    ingredientName = await shop.findItemName(ingredientName, shopData);
    if (ingredientName == 'ERROR' && newValue != '') {
      return 'Invalid ingredient!';
    }
  }
  if (category === 'recipeOptions' && fieldName.includes('Result')) {
    let resultName = newValue.split(' ').slice(1).join(' ');
    resultName = await shop.findItemName(resultName, shopData);
    if (resultName == 'ERROR' && newValue != '') {
      return 'Invalid result!';
    }
  }
  recipeData[category][fieldName] = newValue;
  if (fieldName == 'Result 1' && recipeName.includes('New Recipe') && recipeData.recipeOptions['Result 2'] == '' && recipeData.recipeOptions['Result 3'] == '' && recipeData.recipeOptions['Result 4'] == '' && recipeData.recipeOptions['Result 5'] == '') {
    let result = newValue.split(' ').slice(1).join(' ');
    if (!recipeData[result]) {
      let data = await dbm.loadCollection('shop');
      if (data[result]) {
        recipeData.recipeOptions['Name'] = result;
        recipeData.recipeOptions['Icon'] = data[result].infoOptions.Icon;
        await dbm.saveFile('recipes', result, recipeData);
        await dbm.docDelete('recipes', recipeName);
        return `This is now a recipe to craft ${result}, name and icon have been changed accordingly.`;
      }
    }
  }
  if (fieldName == 'Name') {
    await dbm.saveFile('recipes', newValue, recipeData);
    await dbm.docDelete('recipes', recipeName);
    userData[userTag].editingFields['Recipe Edited'] = newValue;
    let characters = Object.keys(userData);
    for (let i = 0; i < characters.length; i++) {
      if (userData[characters[i]].cooldowns && userData[characters[i]].cooldowns.craftSlots && characters[i] == 'thegreatferret') {
        let slots = userData[characters[i]].cooldowns.craftSlots;
        let slotsKeys = Object.keys(slots);
        for (let j = 0; j < slotsKeys.length; j++) {
          let key = slotsKeys[j];
          if (key == recipeName) {
            slots[newValue] = slots[key];
            delete slots[key];
          }
          if (key.slice(0, 7) == 'REPEAT_' && !isNaN(key.slice(7, 8)) && key.slice(8, 9) == '_' && key.slice(9) == recipeName) {
            let newKey = 'REPEAT_' + key.slice(7, 8) + '_' + newValue;
            slots[newKey] = slots[key];
            delete slots[key];
          }
        }
        userData[characters[i]].cooldowns.craftSlots = slots;
      }
    }
    await dbm.saveCollection('characters', userData);
    return `Recipe name changed to ${newValue}`;
  } else {
    await dbm.saveFile('recipes', recipeName, recipeData);
    return `Field ${fieldNumber} changed to ${newValue}`;
  }
}

module.exports = {
  addRecipe,
  recipesEmbed,
  editRecipeMenu,
  editRecipeField,
};
