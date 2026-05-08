// src/lib/dingtalk.ts
import crypto from 'crypto';

const DINGTALK_AUTH_BASE = 'https://login.dingtalk.com/oauth2/auth';
const DINGTALK_TOKEN_URL = 'https://api.dingtalk.com/v1.0/oauth2/userAccessToken';
const DINGTALK_USER_INFO_URL = 'https://api.dingtalk.com/v1.0/contact/users/me';

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
