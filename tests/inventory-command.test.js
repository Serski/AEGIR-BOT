const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const root = path.join(__dirname, '..');
const commandPath = path.join(root, 'commands', 'shopCommands', 'inventory.js');

function mockModule(modulePath, mock) {
  const resolved = require.resolve(modulePath);
  require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports: mock };
}

test('/inventory command resolves character and formats embed', async (t) => {
  let calledId;
  mockModule(path.join(root, 'db', 'inventory.js'), {
    getInventoryView: async (id) => {
      calledId = id;
      return [{ item_id: 'test', name: 'Test', quantity: 1, category: 'Misc' }];
    },
  });
  mockModule(path.join(root, 'db', 'characters.js'), {
    ensureAndGetId: async () => 'char123',
  });
  mockModule(path.join(root, 'pg-client.js'), {
    query: async () => ({ rows: [] }),
  });
  mockModule('discord.js', {
    SlashCommandBuilder: class { setName() { return this; } setDescription() { return this; } },
    EmbedBuilder: class {
      setTitle(t) { this.title = t; return this; }
      setColor(c) { this.color = c; return this; }
      setDescription(d) { this.description = d; return this; }
    },
  });

  const command = require(commandPath);
  let replied;
  const interaction = {
    user: { id: '123456789012345678', username: 'TestUser', tag: 'TestUser#0001' },
    reply: async (payload) => { replied = payload; },
  };

  await command.execute(interaction);
  assert.equal(calledId, 'char123');
  assert.ok(/Test/.test(replied.embeds[0].description));
  assert.equal(replied.ephemeral, true);

  t.after(() => {
    delete require.cache[require.resolve(path.join(root, 'db', 'inventory.js'))];
    delete require.cache[require.resolve(path.join(root, 'db', 'characters.js'))];
    delete require.cache[require.resolve(path.join(root, 'pg-client.js'))];
    delete require.cache[require.resolve('discord.js')];
    delete require.cache[commandPath];
  });
});

