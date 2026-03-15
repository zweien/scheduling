'use client';

import { Header } from '@/components/Header';
import { TokenManager } from '@/components/TokenDialog';
import { PasswordForm } from '@/components/PasswordDialog';

export default function SettingsPage() {
  return (
    <div className="h-screen flex flex-col">
      <Header currentSection="设置" />
      <main className="flex-1 overflow-y-auto bg-muted/30">
        <div className="max-w-5xl mx-auto p-4 sm:p-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
          <section className="rounded-2xl border bg-card p-4 sm:p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">API Token 配置</h2>
              <p className="text-sm text-muted-foreground">创建、查看和禁用外部集成使用的 Bearer Token。</p>
            </div>
            <TokenManager />
          </section>

          <section className="rounded-2xl border bg-card p-4 sm:p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">修改密码</h2>
              <p className="text-sm text-muted-foreground">更新登录系统所需的本地管理密码。</p>
            </div>
            <PasswordForm />
          </section>
        </div>
      </main>
    </div>
  );
}
