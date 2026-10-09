import test from 'node:test';
import assert from 'node:assert/strict';

const modulePath = new URL('../src/lib/dingtalk-identity.ts', import.meta.url).href;
const load = () => import(`${modulePath}?t=${Date.now()}-${Math.random()}`);

test('parseAppAccessToken 解析 accessToken 与 expireIn', async () => {
  const { parseAppAccessToken } = await load();
  assert.deepEqual(parseAppAccessToken({ accessToken: 'fw8ef', expireIn: 7200 }), {
    accessToken: 'fw8ef',
    expireIn: 7200,
  });
});

test('parseAppAccessToken 缺少 expireIn 时回退 7200 秒', async () => {
  const { parseAppAccessToken } = await load();
  assert.equal(parseAppAccessToken({ accessToken: 'abc' }).expireIn, 7200);
});

test('parseAppAccessToken 缺少 accessToken 时抛错', async () => {
  const { parseAppAccessToken } = await load();
  assert.throws(() => parseAppAccessToken({ expireIn: 7200 }), /access token missing/);
  assert.throws(() => parseAppAccessToken(null), /invalid access token response/);
});

test('parseLoginFreeUserInfo 解析旧版 oapi 响应中的 result', async () => {
  const { parseLoginFreeUserInfo } = await load();
  const parsed = parseLoginFreeUserInfo({
    errcode: 0,
    errmsg: 'ok',
    result: { userid: 'userid123', unionid: 'gliiW0piiii02zBUjUxxxx', name: '张xx' },
  });
  assert.deepEqual(parsed, {
    userId: 'userid123',
    unionId: 'gliiW0piiii02zBUjUxxxx',
    nick: '张xx',
  });
});

test('parseLoginFreeUserInfo 在 errcode 非 0 时抛错并带上错误信息', async () => {
  const { parseLoginFreeUserInfo } = await load();
  assert.throws(
    () => parseLoginFreeUserInfo({ errcode: 40078, errmsg: 'invalid code' }),
    /40078 invalid code/
  );
});

test('parseLoginFreeUserInfo 缺少 userid 时抛错', async () => {
  const { parseLoginFreeUserInfo } = await load();
  assert.throws(
    () => parseLoginFreeUserInfo({ errcode: 0, result: { unionid: 'u1' } }),
    /userid missing/
  );
});

test('buildDingtalkUsername 剔除非法字符并限制长度', async () => {
  const { buildDingtalkUsername } = await load();
  assert.equal(buildDingtalkUsername('abc123XYZ789'), 'dingtalk_abc123XY');
  assert.equal(buildDingtalkUsername('a-b_c.d'), 'dingtalk_abcd');
  assert.equal(buildDingtalkUsername('---'), 'dingtalk_unknown');
});

test('buildDingtalkDisplayName 优先用昵称，缺失时兜底', async () => {
  const { buildDingtalkDisplayName } = await load();
  assert.equal(buildDingtalkDisplayName('张三', 'abcdefgh'), '张三');
  assert.equal(buildDingtalkDisplayName('   ', 'abcdefgh'), '钉钉用户_abcd');
});

test('resolveDingtalkAccount：随机账号都不命中时要求新建', async () => {
  const { resolveDingtalkAccount } = await load();
  const result = resolveDingtalkAccount({}, { openId: 'o1', unionId: 'u1', nick: '张三' });
  assert.equal(result.kind, 'create');
});

test('resolveDingtalkAccount：优先按 unionId 命中（扫码与免登打通同一账号）', async () => {
  const { resolveDingtalkAccount } = await load();
  const byUnionId = { id: 1, dingtalk_open_id: 'o1', dingtalk_union_id: 'u1', dingtalk_nick: '张三' };
  const byIdentity = { id: 2, dingtalk_open_id: 'o2', dingtalk_union_id: 'u2', dingtalk_nick: '李四' };

  const result = resolveDingtalkAccount({ byUnionId, byIdentity }, { openId: 'o2', unionId: 'u1' });
  assert.equal(result.kind, 'existing');
  assert.equal(result.account.id, 1);
  assert.equal(result.patch, null);
});

test('resolveDingtalkAccount：unionId 未命中时回退 openId 并回填 union_id', async () => {
  const { resolveDingtalkAccount } = await load();
  const byIdentity = { id: 7, dingtalk_open_id: 'o7', dingtalk_union_id: null, dingtalk_nick: null };

  const result = resolveDingtalkAccount({ byIdentity }, { openId: 'o7', unionId: 'u7', nick: '王五' });
  assert.equal(result.kind, 'existing');
  assert.equal(result.account.id, 7);
  assert.deepEqual(result.patch, { dingtalk_union_id: 'u7', dingtalk_nick: '王五' });
});

test('resolveDingtalkAccount：免登命中已有扫码账号时回填 open_id', async () => {
  const { resolveDingtalkAccount } = await load();
  const byUnionId = { id: 3, dingtalk_open_id: null, dingtalk_union_id: 'u3', dingtalk_nick: '赵六' };

  const result = resolveDingtalkAccount({ byUnionId }, { openId: 'o3', unionId: 'u3', nick: '赵六' });
  assert.equal(result.kind, 'existing');
  assert.deepEqual(result.patch, { dingtalk_open_id: 'o3' });
});

test('resolveDingtalkAccount：已有字段不覆盖', async () => {
  const { resolveDingtalkAccount } = await load();
  const byUnionId = { id: 4, dingtalk_open_id: 'o4', dingtalk_union_id: 'u4', dingtalk_nick: '钱七' };

  const result = resolveDingtalkAccount({ byUnionId }, { openId: 'o4', unionId: 'u4', nick: '新昵称' });
  assert.equal(result.kind, 'existing');
  assert.equal(result.patch, null);
});
