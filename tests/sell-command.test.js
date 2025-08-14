const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const root = path.join(__dirname, '..');
const commandPath = path.join(root, 'commands', 'salesCommands', 'sell.js');

function mockModule(modulePath, mock) {
  const resolved = require.resolve(modulePath);
  require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports: mock };
}

test('/sell requires existing character', async (t) => {
  let postCalled = false;
  mockModule(path.join(root, 'pg-client.js'), {
    query: async () => ({ rows: [], rowCount: 0 })
  });
  mockModule(path.join(root, 'marketplace.js'), {
    postSale: async () => { postCalled = true; },
  });
  mockModule(path.join(root, 'db', 'items.js'), {
    resolveItemCode: async () => 'sword',
  });
  mockModule(path.join(root, 'clientManager.js'), { getEmoji: () => '' });
  mockModule('discord.js', {
    SlashCommandBuilder: class {
      setName() { return this; }
      setDescription() { return this; }
      addStringOption(fn) {
        fn({
          setName() { return this; },
          setDescription() { return this; },
          setRequired() { return this; }
        });
        return this;
      }
      addIntegerOption(fn) {
        fn({ setName() { return this; }, setDescription() { return this; } });
        return this;
      }
    }
  });

  const command = require(commandPath);
  let replyPayload;
  const interaction = {
    user: { id: 'userX' },
    reply: async (payload) => { replyPayload = payload; }
  };

  await command.execute(interaction);

  assert.equal(postCalled, false);
  assert.deepEqual(replyPayload, {
    content: "You haven't made a character! Use /newchar first",
    ephemeral: true,
  });

  t.after(() => {
    delete require.cache[require.resolve(path.join(root, 'marketplace.js'))];
    delete require.cache[require.resolve(path.join(root, 'db', 'items.js'))];
    delete require.cache[require.resolve(path.join(root, 'clientManager.js'))];
    delete require.cache[require.resolve(path.join(root, 'pg-client.js'))];
    delete require.cache[require.resolve('discord.js')];
    delete require.cache[commandPath];
  });
});

