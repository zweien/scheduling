import test from 'node:test';
import assert from 'node:assert/strict';

const modulePath = new URL('../src/lib/app-version.ts', import.meta.url).href;

async function loadModule() {
  return import(`${modulePath}?t=${Date.now()}-${Math.random()}`);
}

test('优先返回 APP_VERSION，并补齐 v 前缀', async () => {
  process.env.APP_VERSION = '1.2.3';
  const { getAppVersion } = await loadModule();

  assert.equal(getAppVersion(), 'v1.2.3');
});

test('APP_VERSION 缺失时回退到 package.json version', async () => {
  const { getDisplayVersion } = await loadModule();

  assert.equal(getDisplayVersion(undefined, '0.1.0'), 'v0.1.0');
});

test('APP_VERSION 已含 v 前缀时保持原样', async () => {
  process.env.APP_VERSION = 'v2.0.0';
  const { getAppVersion } = await loadModule();

  assert.equal(getAppVersion(), 'v2.0.0');
});

test('版本值异常时回退到开发占位值', async () => {
  const { getDisplayVersion } = await loadModule();

  assert.equal(getDisplayVersion('', ''), 'v0.0.0-dev');
});
