const shop = require('./shop');
const char = require('./char');
const marketplace = require('./marketplace');
const admin = require('./admin');
const panel = require('./panel');
const logger = require('./logger');

const sanitizeCategory = (category) => {
  const sanitized = (category || '').trim().toLowerCase();
  return sanitized === 'ship' ? 'ships' : sanitized;
};

// MODALS
const addItem = async (interaction) => {
  // Get the data entered by the user
  const itemName = interaction.fields.getTextInputValue('itemname');
  const itemPrice = interaction.fields.getTextInputValue('itemprice');
  const itemDescription = interaction.fields.getTextInputValue('itemdescription');
  const itemCategory = sanitizeCategory(interaction.fields.getTextInputValue('itemcategory'));
  const warshipStats = interaction.fields.getTextInputValue('warshipstats');

  const priceInt = itemPrice ? parseInt(itemPrice) : undefined;
  if (itemPrice && isNaN(priceInt)) {
    await interaction.reply({content: 'Item creation failed. Price must be an integer.', ephemeral: true});
    return;
  }

  // Call the addItem function from the Shop class with the collected information
  if (itemName) {
    const itemData = {
      Description: itemDescription,
      Category: itemCategory,
      "Transferrable (Y/N)": "Yes",
    };
    if (priceInt !== undefined) {
      itemData["Price (#)"] = priceInt;
    }
    if (warshipStats) {
      const stats = warshipStats.split(/[\s,]+/).filter(Boolean).map(v => parseInt(v));
      if (stats[0] !== undefined && !isNaN(stats[0])) itemData.Attack = stats[0];
      if (stats[1] !== undefined && !isNaN(stats[1])) itemData.Defence = stats[1];
      if (stats[2] !== undefined && !isNaN(stats[2])) itemData.Speed = stats[2];
      if (stats[3] !== undefined && !isNaN(stats[3])) itemData.HP = stats[3];
    }
    await shop.addItem(itemName, itemData);
    await interaction.reply({content: `Item '${itemName}' has been added to the item list. Use /shoplayout or ping Alex to add to shop.`, ephemeral: true});
  } else {
    // Handle missing information
    await interaction.reply({content: 'Item creation failed. Please provide a name.', ephemeral: true});
  }
};
// {
// // addUseCase = async (interaction) => {
// //   // Get the data entered by the user
// //   const itemName = interaction.fields.getTextInputValue('itemname');
// //   const itemUseType = interaction.fields.getTextInputValue('itemusetype');
// //   let itemGives;
// //   if (interaction.fields.getField("itemgives").value) {
// //     itemGives = interaction.fields.getTextInputValue('itemgives');
// //   } else {
// //     itemGives = "Empty Field";
// //   }
// //   let itemTakes;
// //   if (interaction.fields.getField("itemtakes").value) {
// //     itemTakes = interaction.fields.getTextInputValue('itemtakes');
// //   } else {
// //     itemTakes = "Empty Field";
// //   }
// //   let itemCountdown;
// //   if (interaction.fields.getField("itemcountdown").value) {
// //     itemCountdown = interaction.fields.getTextInputValue('itemcountdown');
// //   } else {
// //     itemCountdown = "Empty Field";
// //   }

// //   // Call the addItem function from the Shop class with the collected information
// //   if (itemName && itemUseType && itemGives) {
// //     let toReturn;
// //     if (itemTakes != "Empty Field") {
// //       if (itemCountdown != "Empty Field") {
// //         toReturn = await shop.addUseCaseWithPriceAndCountdown(itemName, itemUseType, itemGives, itemTakes, itemCountdown);
// //       } else {
// //         toReturn = await shop.addUseCaseWithPrice(itemName, itemUseType, itemGives, itemTakes);
// //       }
// //     } else {
// //       if (itemCountdown != "Empty Field") {
// //         toReturn = await shop.addUseCaseWithCountdown(itemName, itemUseType, itemGives, itemCountdown);
// //       } else {
// //         toReturn = await shop.addUseCase(itemName, itemUseType, itemGives);
// //       }
// //     }
// //     interaction.reply(toReturn);
// //   } else {
// //     // Handle missing information
// //     await interaction.reply('Item use creation failed. Please give a name, use type and record what using the item gives.');
// //   }
// // };

// // addRecipe = async (interaction) => {
// //   // Get the data entered by the user
// //   const itemName = interaction.fields.getTextInputValue('itemname');
// //   const itemTakes = interaction.fields.getTextInputValue('itemtakes');
// //   const itemCrafttime = interaction.fields.getTextInputValue('itemcrafttime');

// //   // Call the addItem function from the Shop class with the collected information
// //   if (itemName && itemTakes && itemCrafttime) {
// //     toReturn = await shop.addRecipe(itemName, itemTakes, itemCrafttime);
// //     interaction.reply(toReturn);
// //   } else {
// //     // Handle missing information
// //     await interaction.reply('Item use creation failed. Please give a name, what the item takes, and enter a craft time.');
// //   }
// // };

// // addUseDescription = async (interaction) => {
// //   const itemName = interaction.fields.getTextInputValue('itemname');
// //   const itemDescription = interaction.fields.getTextInputValue('itemdescription');

// //   // Call the addItem function from the Shop class with the collected information
// //   if (itemName && itemDescription) {
// //     let toReturn;
// //     toReturn = await shop.addUseDescription(itemName, itemDescription);
// //     interaction.reply(toReturn);
// //   } else {
// //     // Handle missing information
// //     await interaction.reply('Item description creation failed. Please give a name and description.');
// //   }
// // }
// }

const newChar = async (interaction) => {
  // Get the data entered by the user
  const userID = interaction.user.tag;
  const numericID = interaction.user.id;
  const charName = interaction.fields.getTextInputValue('charname');
  const charBio = interaction.fields.getTextInputValue('charbio');

  // const eastAngliaRole = interaction.guild.roles.cache.find(role => role.name === "East Anglia");
  // const eastAngliaID = eastAngliaRole.id;
  // const gwyneddRole = interaction.guild.roles.cache.find(role => role.name === "Gwynedd");
  // const gwyneddID = gwyneddRole.id;
  // const wessexRole = interaction.guild.roles.cache.find(role => role.name === "Wessex");
  // const wessexID = wessexRole.id;

  //var userKingdom = "Error";

  // Check the user's roles
  // const userRoles = interaction.member.roles.cache;
  // if (userRoles.has(eastAngliaID)) {
  //   userKingdom = "East Anglia";
  // }
  // if (userRoles.has(gwyneddID)) {
  //   if (userKingdom != "Error") {
  //     userKingdom = "WHY DO YOU HAVE TWO KINGDOMS? SERSKI THIS IS A PROBLEM WE DO NOT ALLOW DUAL CITIZENS HERE";
  //   } else {
  //     userKingdom = "Gwynedd";
  //   }
  // } else if (userRoles.has(wessexID)) {
  //   if (userKingdom != "Error") {
  //     userKingdom = "WHY DO YOU HAVE TWO KINGDOMS? SERSKI THIS IS A PROBLEM WE DO NOT ALLOW DUAL CITIZENS HERE";
  //   } else {
  //     userKingdom = "Wessex";
  //   }
  // }

  // Call the newChar function from the char class with the info
  if (charName && charBio) {
    await char.newChar(userID, charName, charBio, numericID);
    await interaction.reply(`Character '${charName}' has been created.`);
  } else {
    // Handle missing information
    await interaction.reply({content: 'Character creation failed. Please provide a name and bio.', ephemeral: true});
  }
};

const shopLayout = async (interaction) => {
  const categoryToEdit = interaction.fields.getTextInputValue('categorytoedit');
  const layoutString = interaction.fields.getTextInputValue('layoutstring');

  await interaction.reply(await shop.shopLayout(categoryToEdit, layoutString));
};

//BUTTONS
const shopSwitch = async (interaction) => {
  const [embed, rows] = await shop.createShopEmbed();
  logger.debug(interaction);
  await interaction.update({ embeds: [embed], components: rows });
};
const incomeSwitch = async (interaction) => {
  await interaction.deferUpdate();
  let [edittedEmbed, rows] = await admin.allIncomes(interaction.customId.slice(11));
  await interaction.editReply({ embeds: [edittedEmbed], components: rows});
};
const salesSwitch = async (interaction) => {
  let [edittedEmbed, rows] = await marketplace.createSalesEmbed(interaction.customId.slice(11));
  await interaction.update({ embeds: [edittedEmbed], components: rows});
};
const allItemSwitch = async (interaction) => {
  let [edittedEmbed, rows] = await shop.createAllItemsEmbed(interaction.customId.slice(11), interaction);
  await interaction.update({ embeds: [edittedEmbed], components: rows});
};
const itemSwitch = async (interaction) => {
  let [edittedEmbed, rows] = await shop.editItemMenu(interaction.customId.substring(12), interaction.customId[11], interaction.user.tag);
  await interaction.update({ embeds: [edittedEmbed], components: [rows]});
};
const balaSwitch = async (interaction) => {
  let [edittedEmbed, rows] = await char.balanceAll(interaction.customId[11])
  await interaction.update({ embeds: [edittedEmbed], components: rows});
};
const helpSwitch = async (interaction) => {
  //This one is odder, will either have the 11th character be "A" or "R" for admin or regular help. The 12th character will be the page number.
  let isAdmin = false;
  if (interaction.customId[11] == "A") {
    isAdmin = true;
  } else if (interaction.customId[11] == "R") {
    isAdmin = false;
  } else {
    await interaction.reply("Error in helpSwitch");
  }
  let [edittedEmbed, rows] = await admin.generalHelpMenu(interaction.customId[12], isAdmin);
  await interaction.update({ embeds: [edittedEmbed], components: rows});
};

const panelInvSwitch = async (interaction) => {
  const page = parseInt(interaction.customId.slice(15));
  let [edittedEmbed, rows] = await panel.inventoryEmbed(interaction.user.id, page);
  await interaction.update({ embeds: [edittedEmbed], components: rows });
};

const panelStoreSwitch = async (interaction) => {
  const page = parseInt(interaction.customId.slice(16));
  let [edittedEmbed, rows] = await panel.storageEmbed(interaction.user.id, page);
  await interaction.update({ embeds: [edittedEmbed], components: rows });
};

const panelShipSwitch = async (interaction) => {
  const page = parseInt(interaction.customId.slice(15));
  let [edittedEmbed, rows] = await panel.shipsEmbed(interaction.user.id, page);
  await interaction.update({ embeds: [edittedEmbed], components: rows });
};

const panelSelect = async (interaction) => {
  const choice = interaction.values[0];
  let edittedEmbed;
  let rows;
  if (choice === 'inventory') {
    [edittedEmbed, rows] = await panel.inventoryEmbed(interaction.user.id, 1);
  } else if (choice === 'resources') {
    [edittedEmbed, rows] = await panel.storageEmbed(interaction.user.id, 1);
  } else if (choice === 'ships') {
    [edittedEmbed, rows] = await panel.shipsEmbed(interaction.user.id, 1);
  } else {
    [edittedEmbed, rows] = await panel.mainEmbed(interaction.user.id);
  }
  await interaction.update({ embeds: [edittedEmbed], components: rows });
};

const handleInteractionError = async (interaction, error) => {
  logger.error(error);
  try {
    if (interaction.replied) {
      await interaction.followUp({ content: 'An error occurred while processing this interaction.', ephemeral: true });
    } else if (interaction.deferred) {
      await interaction.editReply({ content: 'An error occurred while processing this interaction.' });
    } else {
      await interaction.reply({ content: 'An error occurred while processing this interaction.', ephemeral: true });
    }
  } catch (followUpError) {
    logger.error(followUpError);
  }
};

exports.handle = async (interaction) => {
  logger.debug(interaction.customId);
  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'additemmodal') {
      try {
        await addItem(interaction);
      } catch (error) {
        await handleInteractionError(interaction, error);
      }
    }
    if (interaction.customId === 'newcharmodal') {
      try {
        await newChar(interaction);
      } catch (error) {
        await handleInteractionError(interaction, error);
      }
    }
    // if (interaction.customId === 'addusecasemodal') {
    //   addUseCase(interaction);
    // }
    // if (interaction.customId === 'addrecipemodal') {
    //   addRecipe(interaction);
    // }
    if (interaction.customId === 'shoplayoutmodal') {
      try {
        await shopLayout(interaction);
      } catch (error) {
        await handleInteractionError(interaction, error);
      }
    }
    //Check if it starts with editmapaboutmodal
    if (interaction.customId.substring(0, 17) === 'editmapaboutmodal') {
      try {
        await admin.editMapAbout(interaction);
      } catch (error) {
        await handleInteractionError(interaction, error);
      }
    }
    // if (interaction.customId === 'addusedescriptionmodal') {
    //   addUseDescription(interaction);
    // }
  } else if (interaction.isButton()) {
    if (interaction.customId.substring(0, 11) == 'switch_page') {
      try {
        await shopSwitch(interaction);
      } catch (error) {
        await handleInteractionError(interaction, error);
      }
    } else if (interaction.customId.substring(0, 11) == 'switch_sale') {
      try {
        await salesSwitch(interaction);
      } catch (error) {
        await handleInteractionError(interaction, error);
      }
    } else if (interaction.customId.substring(0, 11) == 'switch_item') {
      try {
        await itemSwitch(interaction);
      } catch (error) {
        await handleInteractionError(interaction, error);
      }
    } else if (interaction.customId.substring(0, 11) == 'switch_help') {
      try {
        await helpSwitch(interaction);
      } catch (error) {
        await handleInteractionError(interaction, error);
      }
    } else if (interaction.customId.substring(0, 11) == 'switch_inco') {
      try {
        await incomeSwitch(interaction);
      } catch (error) {
        await handleInteractionError(interaction, error);
      }
    } else if (interaction.customId.substring(0, 11) === 'switch_alit') {
      try {
        await allItemSwitch(interaction);
      } catch (error) {
        await handleInteractionError(interaction, error);
      }
    } else if (interaction.customId.substring(0, 11) === 'switch_bala') {
      try {
        await balaSwitch(interaction);
      } catch (error) {
        await handleInteractionError(interaction, error);
      }
    } else if (interaction.customId.substring(0, 11) === 'partySelect') {
      try {
        await admin.selectParty(interaction);
      } catch (error) {
        await handleInteractionError(interaction, error);
      }
    } else if (interaction.customId.substring(0, 15) === 'panel_inv_page') {
      try {
        await panelInvSwitch(interaction);
      } catch (error) {
        await handleInteractionError(interaction, error);
      }
    } else if (interaction.customId.substring(0, 16) === 'panel_store_page') {
      try {
        await panelStoreSwitch(interaction);
      } catch (error) {
        await handleInteractionError(interaction, error);
      }
    } else if (interaction.customId.substring(0, 15) === 'panel_ship_page') {
      try {
        await panelShipSwitch(interaction);
      } catch (error) {
        await handleInteractionError(interaction, error);
      }
    }
  } else if (interaction.isSelectMenu()) {
    if (interaction.customId === 'shireSelect') {
      try {
        await admin.selectShire(interaction);
      } catch (error) {
        await handleInteractionError(interaction, error);
      }
    }
    if (interaction.customId === 'resourceSelect') {
      try {
        await admin.selectResource(interaction);
      } catch (error) {
        await handleInteractionError(interaction, error);
      }
    }
    if (interaction.customId === 'tradeNodeSelect') {
      try {
        await admin.selectTradeNode(interaction);
      } catch (error) {
        await handleInteractionError(interaction, error);
      }
    }
    if (interaction.customId === 'classSelect') {
      try {
        await admin.selectClass(interaction);
      } catch (error) {
        await handleInteractionError(interaction, error);
      }
    }
    if (interaction.customId === 'panel_select') {
      try {
        await panelSelect(interaction);
      } catch (error) {
        await handleInteractionError(interaction, error);
      }
    }
  }
}

