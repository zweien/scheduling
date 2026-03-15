import test from 'node:test';
import assert from 'node:assert/strict';

const modulePath = new URL('../src/lib/session-config.ts', import.meta.url).href;

async function loadConfigModule() {
  return import(`${modulePath}?t=${Date.now()}-${Math.random()}`);
}

test('throws when NODE_ENV is production and SESSION_SECRET is missing', async () => {
  const { resolveSessionPassword } = await loadConfigModule();

  assert.throws(
    () => resolveSessionPassword({ NODE_ENV: 'production' }),
    /SESSION_SECRET/
  );
});

test('allows fallback when NODE_ENV is not production', async () => {
  const { resolveSessionPassword } = await loadConfigModule();

  assert.equal(
    resolveSessionPassword({ NODE_ENV: 'development' }),
    'complex_password_at_least_32_characters_long_for_security'
  );
});

test('returns configured secret when provided', async () => {
  const { resolveSessionPassword } = await loadConfigModule();

  assert.equal(
    resolveSessionPassword({ NODE_ENV: 'production', SESSION_SECRET: 'secret-value' }),
    'secret-value'
  );
});
