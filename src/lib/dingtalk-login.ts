// src/lib/dingtalk-login.ts
// 钉钉登录的共用落库与会话逻辑：扫码登录（OAuth2）与工作台免登共用
import { getAccountByDingtalkOpenId, getAccountByDingtalkUnionId, createDingtalkAccount, updateAccountDingtalkIdentity } from './accounts';
import { resolveDingtalkAccount } from './dingtalk-identity';
import { getSession } from './session';
import { addWebLog } from './logs';
import type { Account } from '@/types';

export type DingtalkLoginResult =
  | { ok: true; account: Account }
  | { ok: false; reason: 'account_disabled' };

/**
 * 依据钉钉身份找到或创建本地账号并写入会话。
 * identity 为渠道唯一标识：扫码登录传 openId，工作台免登传 userid。
 */
export async function completeDingtalkLogin(input: {
  openId?: string;
  unionId?: string;
  nick?: string;
  identity: string;
  source: 'dingtalk_qr' | 'dingtalk_workbench';
}): Promise<DingtalkLoginResult> {
  const byUnionId = input.unionId ? getAccountByDingtalkUnionId(input.unionId) : undefined;
  const byIdentity = input.openId ? getAccountByDingtalkOpenId(input.openId) : undefined;

  const match = resolveDingtalkAccount(
    { byUnionId, byIdentity },
    { openId: input.openId, unionId: input.unionId, nick: input.nick }
  );

  let account: Account;
  if (match.kind === 'existing') {
    account = match.patch
      ? updateAccountDingtalkIdentity(match.account.id, match.patch)
      : match.account;
  } else {
    account = createDingtalkAccount({
      openId: input.openId,
      unionId: input.unionId,
      nick: input.nick,
      identity: input.identity,
    });
  }

  if (!account.is_active) {
    return { ok: false, reason: 'account_disabled' };
  }

  const session = await getSession();
  session.isLoggedIn = true;
  session.accountId = account.id;
  session.username = account.username;
  session.displayName = account.display_name;
  session.role = account.role;
  await session.save();

  await addWebLog(
    'dingtalk_login',
    `账号: ${account.username}`,
    undefined,
    `${input.source === 'dingtalk_qr' ? '钉钉扫码登录' : '钉钉工作台免登'} (${account.role})`,
    { username: account.username, role: account.role }
  );

  return { ok: true, account };
}
