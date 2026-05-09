// src/app/api/auth/dingtalk/workbench/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserAccessToken, getDingtalkUserInfo, buildAppUrl } from '@/lib/dingtalk';
import { getAccountByDingtalkOpenId, createDingtalkAccount } from '@/lib/accounts';
import { getSession } from '@/lib/session';
import { addWebLog } from '@/lib/logs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const authCode = body.authCode as string | undefined;

    if (!authCode) {
      return NextResponse.json({ error: 'authCode is required' }, { status: 400 });
    }

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
      return NextResponse.json({ error: 'account_disabled' }, { status: 403 });
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
    await addWebLog('dingtalk_login', `账号: ${account.username}`, undefined, `钉钉工作台免登 (${account.role})`, {
      username: account.username,
      role: account.role,
    });

    return NextResponse.json({ success: true, redirect: '/dashboard' });
  } catch (error) {
    console.error('DingTalk workbench auth error:', error);
    return NextResponse.json({ error: 'dingtalk_auth_failed' }, { status: 500 });
  }
}
