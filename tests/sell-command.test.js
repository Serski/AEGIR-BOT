const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const root = path.join(__dirname, '..');
const commandPath = path.join(root, 'commands', 'salesCommands', 'sell.js');

function mockModule(modulePath, mock) {
  const resolved = require.resolve(modulePath);
  require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports: mock };
}

test('/sell lists item and ensures character', async (t) => {
  let ensureCalled = false;
  let postArgs;
  mockModule(path.join(root, 'db', 'characters.js'), {
    ensureAndGetId: async (user) => {
      ensureCalled = true;
      return 'charX';
    },
  });
  mockModule(path.join(root, 'marketplace.js'), {
    postSale: async (args) => {
      postArgs = args;
      return { ok: true, itemCode: args.itemCode, price: args.price, quantity: args.quantity };
    },
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
    options: {
      getString: () => 'sword',
      getInteger: () => null,
    },
    reply: async (payload) => { replyPayload = payload; }
  };

  await command.execute(interaction);

  assert.equal(ensureCalled, true);
  assert.deepEqual(postArgs, { userId: 'charX', itemCode: 'sword', price: 0, quantity: 1 });
  assert.equal(replyPayload, 'Listed 1 × sword for 0 each on the marketplace.');

  t.after(() => {
    delete require.cache[require.resolve(path.join(root, 'marketplace.js'))];
    delete require.cache[require.resolve(path.join(root, 'db', 'items.js'))];
    delete require.cache[require.resolve(path.join(root, 'clientManager.js'))];
    delete require.cache[require.resolve(path.join(root, 'db', 'characters.js'))];
    delete require.cache[require.resolve('discord.js')];
    delete require.cache[commandPath];
  });
});

