// src/app/api/auth/dingtalk/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserAccessToken, getDingtalkUserInfo, buildAppUrl } from '@/lib/dingtalk';
import { getAccountByDingtalkOpenId, createDingtalkAccount } from '@/lib/accounts';
import { getSession } from '@/lib/session';
import { addWebLog } from '@/lib/logs';

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
    // authCode → accessToken
    const tokenResult = await getUserAccessToken(authCode);

    // accessToken → 用户信息
    const userInfo = await getDingtalkUserInfo(tokenResult.accessToken);

    // 查找或创建账号
    let account = getAccountByDingtalkOpenId(userInfo.openId);
    if (!account) {
      account = createDingtalkAccount({
        openId: userInfo.openId,
        unionId: userInfo.unionId,
        nick: userInfo.nick,
      });
    }

    if (!account.is_active) {
      return NextResponse.redirect(buildAppUrl(request, '/?error=account_disabled'));
    }

    // 设置 session
    const session = await getSession();
    session.isLoggedIn = true;
    session.accountId = account.id;
    session.username = account.username;
    session.displayName = account.display_name;
    session.role = account.role;
    await session.save();

    // 记录日志
    await addWebLog('dingtalk_login', `账号: ${account.username}`, undefined, `钉钉扫码登录 (${account.role})`, {
      username: account.username,
      role: account.role,
    });

    return NextResponse.redirect(buildAppUrl(request, '/dashboard'));
  } catch (error) {
    console.error('DingTalk OAuth callback error:', error);
    return NextResponse.redirect(buildAppUrl(request, '/?error=dingtalk_auth_failed'));
  }
}
