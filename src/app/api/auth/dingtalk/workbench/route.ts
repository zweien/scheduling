// src/app/api/auth/dingtalk/workbench/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getLoginFreeUser } from '@/lib/dingtalk';
import { completeDingtalkLogin } from '@/lib/dingtalk-login';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const authCode = body.authCode as string | undefined;

    if (!authCode) {
      return NextResponse.json({ error: 'authCode is required' }, { status: 400 });
    }

    // 免登码 → 用户身份（应用 access_token + getuserinfo）
    const userInfo = await getLoginFreeUser(authCode);

    const result = await completeDingtalkLogin({
      openId: undefined,
      unionId: userInfo.unionId,
      nick: userInfo.nick,
      identity: userInfo.userId,
      source: 'dingtalk_workbench',
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: 403 });
    }

    return NextResponse.json({ success: true, redirect: '/dashboard' });
  } catch (error) {
    console.error('DingTalk workbench auth error:', error);
    return NextResponse.json({ error: 'dingtalk_auth_failed' }, { status: 500 });
  }
}