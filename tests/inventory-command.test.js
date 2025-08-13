const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const root = path.join(__dirname, '..');
const commandPath = path.join(root, 'commands', 'shopCommands', 'inventory.js');

function mockModule(modulePath, mock) {
  const resolved = require.resolve(modulePath);
  require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports: mock };
}

test('/inventory command uses user id identifier', async (t) => {
  let calledId;
  mockModule(path.join(root, 'db', 'inventory.js'), {
    getInventoryView: async (id) => {
      calledId = id;
      return [{ name: 'Test', quantity: 1, category: 'Misc' }];
    },
  });
  mockModule('discord.js', {
    SlashCommandBuilder: class { setName() { return this; } setDescription() { return this; } }
  });

  const command = require(commandPath);
  let replied;
  const interaction = {
    user: { id: '123456789012345678', tag: 'TestUser#0001' },
    reply: async (payload) => { replied = payload; }
  };

  await command.execute(interaction);
  assert.equal(calledId, '123456789012345678');
  assert.equal(replied.content, '• Test — x1 [Misc]');
  assert.equal(replied.ephemeral, true);

  t.after(() => {
    delete require.cache[require.resolve(path.join(root, 'db', 'inventory.js'))];
    delete require.cache[require.resolve('discord.js')];
    delete require.cache[commandPath];
  });
});

