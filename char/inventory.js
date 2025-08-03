const dbm = require('../database-manager');
const shop = require('../shop');
const clientManager = require('../clientManager');
const charMain = require('../char');

async function addItemToRole(role, item, amount) {
  let collectionName = 'characters';
  let charData = await dbm.loadCollection(collectionName);
  let members = await role.guild.members.fetch();
  members = members.filter(member => member.roles.cache.has(role.id));
  let errorMembers = [];
  for (let [id, member] of members) {
    let charID = member.user.username;
    if (!charData[charID]) {
      errorMembers.push(charID);
      continue;
    }
    if (!charData[charID].inventory) {
      charData[charID].inventory = {};
    }
    if (amount > 0) {
      charData[charID].inventory[item] = (charData[charID].inventory[item] || 0) + amount;
    } else if (amount < 0) {
      charData[charID].inventory[item] = Math.max((charData[charID].inventory[item] || 0) + amount, 0);
      if (charData[charID].inventory[item] === 0) {
        delete charData[charID].inventory[item];
      }
    }
  }
  await dbm.saveCollection(collectionName, charData);
  return errorMembers;
}

async function store(player, item, amount) {
  let collectionName = 'characters';
  let shopData = await dbm.loadCollection('shop');
  item = await shop.findItemName(item, shopData);
  let charData;
  [player, charData] = await charMain.findPlayerData(player);
  if (!player) {
    return 'Error: Player not found';
  }
  if (item === 'ERROR') {
    return 'Not a valid item';
  }
  if (charData) {
    if (!charData.inventory) {
      charData.inventory = {};
    }
    if (!charData.storage) {
      charData.storage = {};
    }
    if (charData.inventory[item] && charData.inventory[item] >= amount) {
      if (charData.storage[item]) {
        charData.storage[item] += amount;
      } else {
        charData.storage[item] = amount;
      }
      charData.inventory[item] -= amount;
      await dbm.saveFile(collectionName, player, charData);
      return true;
    } else {
      return "You don't have enough of that item!";
    }
  }
}

async function grab(player, item, amount) {
  let collectionName = 'characters';
  let shopData = await dbm.loadCollection('shop');
  item = await shop.findItemName(item, shopData);
  let charData;
  [player, charData] = await charMain.findPlayerData(player);
  if (!player) {
    return 'Error: Player not found';
  }
  if (item === 'ERROR') {
    return 'Not a valid item';
  }
  if (charData) {
    if (!charData.inventory) {
      charData.inventory = {};
    }
    if (!charData.storage) {
      charData.storage = {};
    }
    if (!charData.storage[item]) {
      charData.storage[item] = 0;
    }
    if (charData.storage[item] && charData.storage[item] >= amount) {
      if (charData.inventory[item]) {
        charData.inventory[item] += amount;
      } else {
        charData.inventory[item] = amount;
      }
      charData.storage[item] -= amount;
      await dbm.saveFile(collectionName, player, charData);
      return true;
    } else {
      return "You don't have enough of that item!";
    }
  }
}

async function deposit(player, gold) {
  let collectionName = 'characters';
  let charData;
  [player, charData] = await charMain.findPlayerData(player);
  if (!player) {
    return 'Error: Player not found';
  }
  if (!charData.bank) {
    charData.bank = 0;
  }
  if (charData) {
    if (charData.balance >= gold) {
      charData.balance -= gold;
      charData.bank += gold;
      await dbm.saveFile(collectionName, player, charData);
      return true;
    } else {
      return "You don't have enough gold!";
    }
  }
}

async function withdraw(player, gold) {
  let collectionName = 'characters';
  let charData;
  [player, charData] = await charMain.findPlayerData(player);
  if (!player) {
    return 'Error: Player not found';
  }
  if (!charData.bank) {
    charData.bank = 0;
  }
  if (charData) {
    if (charData.bank >= gold) {
      charData.balance += gold;
      charData.bank -= gold;
      await dbm.saveFile(collectionName, player, charData);
      return true;
    } else {
      return "You don't have enough gold!";
    }
  }
}

async function bank(userID) {
  let collectionName = 'characters';
  let charData = await dbm.loadFile(collectionName, userID);
  if (charData) {
    if (!charData.bank) {
      charData.bank = 0;
    }
    const charEmbed = {
      color: 0x36393e,
      author: {
        name: charData.name,
        icon_url: charData.icon ? charData.icon : 'https://cdn.discordapp.com/attachments/890351376004157440/1332678517888126986/NEW_LOGO_CLEAN_smallish.png?ex=6798c416&is=67977296&hm=ada5afdd0bcb677d3a0a1ca6aabe55f554810e3044048ac4e5cd85d0d73e7f0d&',
      },
      description: clientManager.getEmoji('Gold') + ' **' + charData.bank + '**',
    };
    return charEmbed;
  } else {
    return "You haven't made a character! Use /newchar first";
  }
}

async function giveItemToPlayer(playerGiving, player, item, amount) {
  if (playerGiving === player) {
    return "You can't give items to yourself!";
  }
  if (amount < 1) {
    return 'Amount must be greater than 0';
  }
  let collectionName = 'characters';
  let shopData = await dbm.loadCollection('shop');
  item = await shop.findItemName(item, shopData);
  if (item === 'ERROR') {
    return 'Not a valid item';
  }
  if (shopData[item].infoOptions['Transferrable (Y/N)'] == 'No') {
    return 'This item cannot be transferred!';
  }
  let charData;
  [playerGiving, charData] = await charMain.findPlayerData(playerGiving);
  if (!playerGiving) {
    return 'Error: Player not found';
  }
  let charData2;
  [player, charData2] = await charMain.findPlayerData(player);
  if (!player) {
    return 'Error: Player not found';
  }
  if (charData && charData2) {
    if (charData.inventory[item] && charData.inventory[item] >= amount) {
      charData.inventory[item] -= amount;
      if (charData2.inventory[item]) {
        charData2.inventory[item] += amount;
      } else {
        charData2.inventory[item] = amount;
      }
      await dbm.saveFile(collectionName, playerGiving, charData);
      await dbm.saveFile(collectionName, player, charData2);
      return true;
    } else {
      return "You don't have enough of that item!";
    }
  }
}

async function giveGoldToPlayer(playerGiving, player, gold) {
  if (playerGiving === player) {
    return "You can't give gold to yourself!";
  }
  if (gold < 1) {
    return 'Amount must be greater than 0';
  }
  let collectionName = 'characters';
  let charData;
  [playerGiving, charData] = await charMain.findPlayerData(playerGiving);
  if (!playerGiving) {
    return 'Error: Player not found';
  }
  let charData2;
  [player, charData2] = await charMain.findPlayerData(player);
  if (!player) {
    return 'Error: Player not found';
  }
  if (charData && charData2) {
    if (charData.balance >= gold) {
      charData.balance -= gold;
      charData2.balance += gold;
      await dbm.saveFile(collectionName, playerGiving, charData);
      await dbm.saveFile(collectionName, player, charData2);
      return true;
    } else {
      return "You don't have enough gold!";
    }
  }
}

module.exports = {
  addItemToRole,
  store,
  grab,
  deposit,
  withdraw,
  bank,
  giveItemToPlayer,
  giveGoldToPlayer,
};
