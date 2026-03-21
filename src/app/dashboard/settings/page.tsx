import { getCurrentAccount, requireAuth } from '@/lib/auth';
import { getDefaultScheduleDays, isRegistrationEnabled } from '@/lib/config';
import { getConfigOptions } from '@/lib/config-options';
import { Header } from '@/components/Header';
import { TokenManager } from '@/components/TokenDialog';
import { PasswordForm } from '@/components/PasswordDialog';
import { RegistrationSettings } from '@/components/RegistrationSettings';
import { DefaultScheduleDaysSettings } from '@/components/DefaultScheduleDaysSettings';
import { ConfigOptionsSection } from '@/components/settings/ConfigOptionsSection';

export default async function SettingsPage() {
  await requireAuth();
  const account = await getCurrentAccount();
  const isAdmin = account?.role === 'admin';
  const defaultScheduleDays = getDefaultScheduleDays();

  // 获取配置选项数据
  const organizations = getConfigOptions('organization');
  const categories = getConfigOptions('category');

  return (
    <div className="h-screen flex flex-col">
      <Header currentSection="设置" />
      <main className="flex-1 overflow-y-auto bg-muted/30">
        <div className="max-w-5xl mx-auto p-4 sm:p-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
          <section className="rounded-2xl border bg-card p-4 sm:p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">API Token 配置</h2>
              <p className="text-sm text-muted-foreground">创建、查看和禁用当前账号可用的 Bearer Token。</p>
            </div>
            <TokenManager />
          </section>

          {isAdmin ? (
            <section className="rounded-2xl border bg-card p-4 sm:p-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold">注册设置</h2>
                <p className="text-sm text-muted-foreground">控制登录页是否开放新用户注册入口。</p>
              </div>
              <RegistrationSettings initialEnabled={isRegistrationEnabled()} />
            </section>
          ) : null}

          {isAdmin ? (
            <section className="rounded-2xl border bg-card p-4 sm:p-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold">排班设置</h2>
                <p className="text-sm text-muted-foreground">调整未填写结束日期时的默认排班天数。</p>
              </div>
              <DefaultScheduleDaysSettings initialDays={defaultScheduleDays} />
            </section>
          ) : null}

          {isAdmin ? (
            <section className="rounded-2xl border bg-card p-4 sm:p-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold">字段配置管理</h2>
                <p className="text-sm text-muted-foreground">管理人员所属单位和类别的选项列表。</p>
              </div>
              <ConfigOptionsSection
                initialOrganizations={organizations}
                initialCategories={categories}
              />
            </section>
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
