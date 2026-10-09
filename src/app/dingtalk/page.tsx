// src/app/dingtalk/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import Link from 'next/link';

declare global {
  interface Window {
    dd?: {
      ready: (fn: () => void) => void;
      env?: { platform?: string };
      requestAuthCode: (params: {
        corpId: string;
        clientId: string;
        onSuccess: (result: { code: string }) => void;
        onFail: (err: unknown) => void;
      }) => void;
    };
  }
}

type Status = 'loading' | 'redirecting' | 'error';

const SDK_SRC = 'https://g.alicdn.com/dingding/dingtalk-jsapi/3.1.0/dingtalk.open.js';
// 钉钉端外不会触发任何回调，需要自行兜底超时后回退到 OAuth 跳转
const AUTH_CODE_TIMEOUT_MS = 4000;

export default function DingtalkPage() {
  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [sdkReady, setSdkReady] = useState(false);

  const fallbackToOAuth = () => {
    window.location.href = '/api/auth/dingtalk';
  };

  useEffect(() => {
    if (!sdkReady) {
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const run = async () => {
      const dd = window.dd;
      // 不在钉钉端内（含普通浏览器、PC 浏览器）→ 直接走 OAuth 扫码登录
      if (!dd || dd.env?.platform === 'notInDingTalk') {
        fallbackToOAuth();
        return;
      }

      // corpId 由钉钉在应用首页地址中把 $CORPID$ 替换后带在 query 上
      const corpId = new URLSearchParams(window.location.search).get('corpid') ?? '';
      if (!corpId) {
        fallbackToOAuth();
        return;
      }

      let clientId = '';
      try {
        const res = await fetch('/api/auth/dingtalk/config');
        const data = await res.json();
        clientId = data.clientId ?? '';
        if (!data.enabled || !clientId) {
          fallbackToOAuth();
          return;
        }
      } catch {
        fallbackToOAuth();
        return;
      }

      if (cancelled) return;

      const exchange = async (code: string) => {
        if (cancelled) return;
        setStatus('redirecting');
        try {
          const res = await fetch('/api/auth/dingtalk/workbench', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ authCode: code }),
          });
          const data = await res.json();
          if (data.redirect) {
            window.location.href = data.redirect;
          } else {
            setStatus('error');
            setErrorMsg(data.error === 'account_disabled' ? '账号已被禁用' : '登录失败，请重试');
          }
        } catch {
          setStatus('error');
          setErrorMsg('请求失败，请重试');
        }
      };

      // requestAuthCode 无需鉴权（无需 dd.config / jsapi_ticket）
      dd.ready(() => {
        if (cancelled) return;
        timer = setTimeout(() => {
          if (!cancelled) fallbackToOAuth();
        }, AUTH_CODE_TIMEOUT_MS);

        try {
          dd.requestAuthCode({
            corpId,
            clientId,
            onSuccess: result => {
              if (timer) clearTimeout(timer);
              void exchange(result.code);
            },
            onFail: () => {
              if (timer) clearTimeout(timer);
              fallbackToOAuth();
            },
          });
        } catch {
          if (timer) clearTimeout(timer);
          fallbackToOAuth();
        }
      });
    };

    void run();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [sdkReady]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Script src={SDK_SRC} strategy="afterInteractive" onReady={() => setSdkReady(true)} onError={fallbackToOAuth} />
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
            <Link href="/" className="text-sm text-primary underline">返回首页</Link>
          </>
        )}
      </div>
    </div>
  );
}
