import { getCurrentAccount, requireAuth } from '@/lib/auth';
import { isRegistrationEnabled } from '@/lib/config';
import { Header } from '@/components/Header';
import { TokenManager } from '@/components/TokenDialog';
import { PasswordForm } from '@/components/PasswordDialog';
import { RegistrationSettings } from '@/components/RegistrationSettings';

export default async function SettingsPage() {
  await requireAuth();
  const account = await getCurrentAccount();
  const isAdmin = account?.role === 'admin';

  return (
    <div className="h-screen flex flex-col">
      <Header currentSection="设置" />
      <main className="flex-1 overflow-y-auto bg-muted/30">
        <div className="max-w-5xl mx-auto p-4 sm:p-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
          {isAdmin ? (
            <>
              <section className="rounded-2xl border bg-card p-4 sm:p-6">
                <div className="mb-4">
                  <h2 className="text-xl font-semibold">API Token 配置</h2>
                  <p className="text-sm text-muted-foreground">创建、查看和禁用外部集成使用的 Bearer Token。</p>
                </div>
                <TokenManager />
              </section>

              <section className="rounded-2xl border bg-card p-4 sm:p-6">
                <div className="mb-4">
                  <h2 className="text-xl font-semibold">注册设置</h2>
                  <p className="text-sm text-muted-foreground">控制登录页是否开放新用户注册入口。</p>
                </div>
                <RegistrationSettings initialEnabled={isRegistrationEnabled()} />
              </section>
            </>
          ) : null}

          <section className="rounded-2xl border bg-card p-4 sm:p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">修改密码</h2>
              <p className="text-sm text-muted-foreground">更新当前登录账号所使用的密码。</p>
            </div>
            <PasswordForm />
          </section>
        </div>
      </main>
    </div>
  );
}
