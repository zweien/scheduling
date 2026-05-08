// src/app/api/auth/dingtalk/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { buildAuthUrl, generateState, buildAppUrl } from '@/lib/dingtalk';
import { cookies } from 'next/headers';

const CALLBACK_PATH = '/api/auth/dingtalk/callback';

export async function GET(request: NextRequest) {
  const state = generateState();
  const redirectUri = buildAppUrl(request, CALLBACK_PATH);

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
