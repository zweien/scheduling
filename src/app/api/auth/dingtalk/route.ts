// src/app/api/auth/dingtalk/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { buildAuthUrl, generateState } from '@/lib/dingtalk';
import { cookies } from 'next/headers';

const CALLBACK_PATH = '/api/auth/dingtalk/callback';

function getRedirectUri(request: NextRequest): string {
  const url = new URL(CALLBACK_PATH, request.url);
  return url.toString();
}

export async function GET(request: NextRequest) {
  const state = generateState();
  const redirectUri = getRedirectUri(request);

  const authUrl = buildAuthUrl(state, redirectUri);

  const response = NextResponse.redirect(authUrl);
  (await cookies()).set('dingtalk_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/api/auth/dingtalk/callback',
  });

  return response;
}
