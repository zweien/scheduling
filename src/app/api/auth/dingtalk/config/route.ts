// src/app/api/auth/dingtalk/config/route.ts
// 工作台免登所需的公开配置（clientId 即 AppKey，与 OAuth2 授权 URL 中暴露的一致，非敏感信息）
import { NextResponse } from 'next/server';
import { isWorkbenchConfigured } from '@/lib/dingtalk';

export async function GET() {
  return NextResponse.json({
    enabled: isWorkbenchConfigured(),
    clientId: process.env.DINGTALK_CLIENT_ID ?? '',
  });
}
