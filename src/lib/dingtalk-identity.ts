// src/lib/dingtalk-identity.ts
// 钉钉身份解析与账号归并的纯函数，便于单元测试（不依赖 Next 运行时与数据库）

export interface AppAccessTokenResponse {
  accessToken: string;
  expireIn: number;
}

export interface DingtalkLoginFreeUser {
  userId: string;
  unionId: string;
  nick: string;
}

/** 解析获取企业内部应用 accessToken 的响应 */
export function parseAppAccessToken(payload: unknown): AppAccessTokenResponse {
  if (!payload || typeof payload !== 'object') {
    throw new Error('invalid access token response');
  }
  const data = payload as Record<string, unknown>;
  const accessToken = data.accessToken;
  const expireIn = data.expireIn;
  if (typeof accessToken !== 'string' || accessToken.length === 0) {
    throw new Error('access token missing in response');
  }
  return {
    accessToken,
    expireIn: typeof expireIn === 'number' && expireIn > 0 ? expireIn : 7200,
  };
}

/**
 * 解析「通过免登码获取用户信息」的响应。
 * 该接口为旧版 oapi 规范：errcode=0 表示成功，用户信息在 result 内。
 */
export function parseLoginFreeUserInfo(payload: unknown): DingtalkLoginFreeUser {
  if (!payload || typeof payload !== 'object') {
    throw new Error('invalid userinfo response');
  }
  const data = payload as Record<string, unknown>;
  if (typeof data.errcode === 'number' && data.errcode !== 0) {
    const msg = typeof data.errmsg === 'string' ? data.errmsg : 'unknown error';
    throw new Error(`getuserinfo failed: ${data.errcode} ${msg}`);
  }

  const result = data.result;
  if (!result || typeof result !== 'object') {
    throw new Error('userinfo result missing');
  }
  const user = result as Record<string, unknown>;
  const userId = user.userid;
  if (typeof userId !== 'string' || userId.length === 0) {
    throw new Error('userid missing in userinfo result');
  }

  return {
    userId,
    unionId: typeof user.unionid === 'string' ? user.unionid : '',
    nick: typeof user.name === 'string' ? user.name : '',
  };
}

/** 依据钉钉身份推导本地账号用户名（openId/userId 前缀，稳定且可读） */
export function buildDingtalkUsername(identity: string): string {
  const prefix = identity.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8) || 'unknown';
  return `dingtalk_${prefix}`;
}

/** 缺少昵称时的兜底显示名 */
export function buildDingtalkDisplayName(nick: string, identity: string): string {
  if (nick.trim()) {
    return nick.trim();
  }
  const prefix = identity.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4) || '0000';
  return `钉钉用户_${prefix}`;
}

export interface DingtalkAccountLike {
  id: number;
  dingtalk_open_id: string | null;
  dingtalk_union_id: string | null;
  dingtalk_nick: string | null;
}

/** 命中已有账号时需要补齐的字段（只回填缺失值，不会置空） */
export type DingtalkIdentityPatch = {
  dingtalk_open_id?: string;
  dingtalk_union_id?: string;
  dingtalk_nick?: string;
};

export type DingtalkMatchResult<T extends DingtalkAccountLike> =
  | { kind: 'existing'; account: T; patch: DingtalkIdentityPatch | null }
  | { kind: 'create' };

/**
 * 决定如何处理一次钉钉登录：
 * 1. 优先按 unionId 匹配（扫码登录与免登返回的 unionId 一致，可跨渠道命中同一账号）
 * 2. 其次按 openId / userId 匹配（历史账号只记录过 open_id）
 * 3. 都没有则新建
 *
 * 命中已有账号时，若缺少对应的 id 字段则回填，使两种登录方式在未来都能命中同一账号。
 */
export function resolveDingtalkAccount<T extends DingtalkAccountLike>(
  candidates: { byUnionId?: T; byIdentity?: T },
  identity: { openId?: string; unionId?: string; nick?: string }
): DingtalkMatchResult<T> {
  const existing = candidates.byUnionId ?? candidates.byIdentity;

  if (!existing) {
    return { kind: 'create' };
  }

  const patch: DingtalkIdentityPatch = {};
  if (identity.openId && !existing.dingtalk_open_id) {
    patch.dingtalk_open_id = identity.openId;
  }
  if (identity.unionId && !existing.dingtalk_union_id) {
    patch.dingtalk_union_id = identity.unionId;
  }
  if (identity.nick && !existing.dingtalk_nick) {
    patch.dingtalk_nick = identity.nick;
  }

  return {
    kind: 'existing',
    account: existing,
    patch: Object.keys(patch).length > 0 ? patch : null,
  };
}
