// src/lib/dingtalk.ts
import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { parseAppAccessToken, parseLoginFreeUserInfo, type AppAccessTokenResponse, type DingtalkLoginFreeUser } from './dingtalk-identity';

const DINGTALK_AUTH_BASE = 'https://login.dingtalk.com/oauth2/auth';
const DINGTALK_TOKEN_URL = 'https://api.dingtalk.com/v1.0/oauth2/userAccessToken';
const DINGTALK_USER_INFO_URL = 'https://api.dingtalk.com/v1.0/contact/users/me';
// 应用级 access_token 与免登码换取 userid（工作台免登使用，与上方 OAuth2 用户级凭证是两套体系）
const DINGTALK_APP_TOKEN_URL = 'https://api.dingtalk.com/v1.0/oauth2/accessToken';
const DINGTALK_LOGIN_FREE_USER_URL = 'https://oapi.dingtalk.com/topapi/v2/user/getuserinfo';

function getClientId() {
  const id = process.env.DINGTALK_CLIENT_ID;
  if (!id) throw new Error('DINGTALK_CLIENT_ID is not configured');
  return id;
}

function getClientSecret() {
  const secret = process.env.DINGTALK_CLIENT_SECRET;
  if (!secret) throw new Error('DINGTALK_CLIENT_SECRET is not configured');
  return secret;
}

export function generateState(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function buildAppUrl(request: NextRequest, path: string): string {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https';
  const host = forwardedHost ?? request.headers.get('host') ?? new URL(request.url).host;
  return `${forwardedProto}://${host}${path}`;
}

export function buildAuthUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    redirect_uri: redirectUri,
    response_type: 'code',
    client_id: getClientId(),
    scope: 'openid',
    state,
    prompt: 'consent',
  });
  return `${DINGTALK_AUTH_BASE}?${params.toString()}`;
}

interface UserAccessTokenResponse {
  accessToken: string;
  refreshToken: string;
  expireIn: number;
}

export async function getUserAccessToken(authCode: string): Promise<UserAccessTokenResponse> {
  const response = await fetch(DINGTALK_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: getClientId(),
      clientSecret: getClientSecret(),
      code: authCode,
      grantType: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to get user access token: ${response.status} ${text}`);
  }

  const data = await response.json();
  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expireIn: data.expireIn,
  };
}

interface DingtalkUserInfo {
  openId: string;
  unionId: string;
  nick: string;
  avatarUrl: string;
  mobile: string;
}

export async function getDingtalkUserInfo(accessToken: string): Promise<DingtalkUserInfo> {
  const response = await fetch(DINGTALK_USER_INFO_URL, {
    headers: {
      'x-acs-dingtalk-access-token': accessToken,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to get dingtalk user info: ${response.status} ${text}`);
  }

  const data = await response.json();
  return {
    openId: data.openId,
    unionId: data.unionId,
    nick: data.nick ?? '',
    avatarUrl: data.avatarUrl ?? '',
    mobile: data.mobile ?? '',
  };
}

// --- 工作台免登：应用级凭证 ---
// 免登流程不用 OAuth2 用户级 token，而是「应用 access_token + 免登码」换 userid。
// access_token 有效期 7200s，进程内缓存，避免频繁调用触发限流。

let appTokenCache: { token: string; expiresAt: number } | null = null;

export async function getAppAccessToken(): Promise<AppAccessTokenResponse> {
  const now = Date.now();
  if (appTokenCache && appTokenCache.expiresAt > now) {
    return { accessToken: appTokenCache.token, expireIn: Math.floor((appTokenCache.expiresAt - now) / 1000) };
  }

  const response = await fetch(DINGTALK_APP_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      appKey: getClientId(),
      appSecret: getClientSecret(),
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to get dingtalk app access token: ${response.status} ${text}`);
  }

  const token = parseAppAccessToken(await response.json());
  // 提前 5 分钟过期，避免边界失效
  appTokenCache = { token: token.accessToken, expiresAt: now + Math.max(token.expireIn - 300, 60) * 1000 };
  return token;
}

/** 免登码 → 用户身份（userid / unionid / 姓名） */
export async function getLoginFreeUser(authCode: string): Promise<DingtalkLoginFreeUser> {
  const { accessToken } = await getAppAccessToken();

  const response = await fetch(`${DINGTALK_LOGIN_FREE_USER_URL}?access_token=${encodeURIComponent(accessToken)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: new URLSearchParams({ code: authCode }).toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to exchange login-free code: ${response.status} ${text}`);
  }

  return parseLoginFreeUserInfo(await response.json());
}

/** 工作台免登是否已具备必要配置（用于前端决定是否走 JSAPI） */
export function isWorkbenchConfigured(): boolean {
  return Boolean(process.env.DINGTALK_CLIENT_ID && process.env.DINGTALK_CLIENT_SECRET);
}
