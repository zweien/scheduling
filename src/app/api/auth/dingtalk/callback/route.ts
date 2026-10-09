// src/app/api/auth/dingtalk/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserAccessToken, getDingtalkUserInfo, buildAppUrl } from '@/lib/dingtalk';
import { completeDingtalkLogin } from '@/lib/dingtalk-login';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const authCode = searchParams.get('authCode') ?? searchParams.get('code');
  const state = searchParams.get('state');

  // 验证 state 防 CSRF
  const cookieStore = await cookies();
  const savedState = cookieStore.get('dingtalk_oauth_state')?.value;

  if (!authCode || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(buildAppUrl(request, '/?error=dingtalk_auth_failed'));
  }

  // 清除 state cookie
  cookieStore.delete('dingtalk_oauth_state');

  try {
    // authCode → 用户级 accessToken → 用户信息（OAuth2 体系）
    const tokenResult = await getUserAccessToken(authCode);
    const userInfo = await getDingtalkUserInfo(tokenResult.accessToken);

    const result = await completeDingtalkLogin({
      openId: userInfo.openId,
      unionId: userInfo.unionId,
      nick: userInfo.nick,
      identity: userInfo.openId,
      source: 'dingtalk_qr',
    });

    if (!result.ok) {
      return NextResponse.redirect(buildAppUrl(request, '/?error=account_disabled'));
    }

    return NextResponse.redirect(buildAppUrl(request, '/dashboard'));
  } catch (error) {
    console.error('DingTalk OAuth callback error:', error);
    return NextResponse.redirect(buildAppUrl(request, '/?error=dingtalk_auth_failed'));
  }
}
