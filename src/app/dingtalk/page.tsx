// src/app/dingtalk/page.tsx
'use client';

import { useEffect, useState } from 'react';

declare global {
  interface Window {
    dd?: {
      ready: (fn: () => void) => void;
      runtime: {
        permission: {
          requestAuthCode: (params: {
            corpId: string;
            onSuccess: (result: { code: string }) => void;
            onFail: (err: unknown) => void;
          }) => void;
        };
      };
    };
  }
}

export default function DingtalkPage() {
  const [status, setStatus] = useState<'loading' | 'error' | 'redirecting'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const corpId = process.env.NEXT_PUBLIC_DINGTALK_CORP_ID;

    if (!corpId) {
      // 没有 corpId，回退到 OAuth 跳转流程
      window.location.href = '/api/auth/dingtalk';
      return;
    }

    // 等待钉钉 JS SDK 加载
    const checkSdk = () => {
      if (window.dd?.ready) {
        window.dd.ready(() => {
          window.dd!.runtime.permission.requestAuthCode({
            corpId,
            onSuccess: async (result) => {
              setStatus('redirecting');
              try {
                const res = await fetch('/api/auth/dingtalk/workbench', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ authCode: result.code }),
                });
                const data = await res.json();
                if (data.redirect) {
                  window.location.href = data.redirect;
                } else {
                  setStatus('error');
                  setErrorMsg(data.error || '登录失败');
                }
              } catch {
                setStatus('error');
                setErrorMsg('请求失败');
              }
            },
            onFail: (err) => {
              console.error('DingTalk requestAuthCode failed:', err);
              // 获取 authCode 失败，回退到 OAuth 跳转
              window.location.href = '/api/auth/dingtalk';
            },
          });
        });
      } else {
        // 不在钉钉环境，回退到 OAuth 跳转
        window.location.href = '/api/auth/dingtalk';
      }
    };

    checkSdk();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        {status === 'loading' && (
          <>
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">正在登录...</p>
          </>
        )}
        {status === 'redirecting' && (
          <p className="text-sm text-muted-foreground">登录成功，正在跳转...</p>
        )}
        {status === 'error' && (
          <>
            <p className="text-sm text-destructive">{errorMsg}</p>
            <a href="/" className="text-sm text-primary underline">返回首页</a>
          </>
        )}
      </div>
    </div>
  );
}
