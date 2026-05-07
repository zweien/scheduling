import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('根包版本与锁文件版本保持一致', () => {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const packageLock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));

  assert.match(packageJson.version, /^\d+\.\d+\.\d+$/);
  assert.equal(packageLock.version, packageJson.version);
  assert.equal(packageLock.packages[''].version, packageJson.version);
});
