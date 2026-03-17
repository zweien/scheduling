'use client';

import { useEffect, useState } from 'react';
import { createAccountAction, getAccounts, updateAccountActiveAction, updateAccountRoleAction } from '@/app/actions/accounts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Account, AccountRole } from '@/types';
import { toast } from 'sonner';

export function AccountManagement() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<AccountRole>('user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadAccounts() {
    const items = await getAccounts();
    setAccounts(items);
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadAccounts();
    });
  }, []);

  async function handleCreate() {
    setError(null);
    setLoading(true);
    const result = await createAccountAction({ username, displayName, password, role });
    setLoading(false);

    if (!result.success) {
      setError(result.error ?? '创建失败');
      return;
    }

    setUsername('');
    setDisplayName('');
    setPassword('');
    setRole('user');
    toast.success('账号创建成功');
    await loadAccounts();
  }

  async function handleRoleChange(accountId: number, nextRole: AccountRole) {
    const result = await updateAccountRoleAction(accountId, nextRole);
    if (!result.success) {
      setError(result.error ?? '更新失败');
      return;
    }
    toast.success('角色已更新');
    await loadAccounts();
  }

  async function handleActiveChange(accountId: number, nextActive: boolean) {
    const result = await updateAccountActiveAction(accountId, nextActive);
    if (!result.success) {
      setError(result.error ?? '更新失败');
      return;
    }
    toast.success(nextActive ? '账号已启用' : '账号已停用');
    await loadAccounts();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-muted/30 p-4">
        <div className="mb-4 space-y-1">
          <h2 className="text-xl font-semibold">系统用户管理</h2>
          <p className="text-sm text-muted-foreground">创建登录账号，并调整角色或启停状态。</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="account-display-name">显示名称</Label>
            <Input id="account-display-name" value={displayName} onChange={event => setDisplayName(event.target.value)} placeholder="例如：李四" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-username">用户名</Label>
            <Input id="account-username" value={username} onChange={event => setUsername(event.target.value)} placeholder="例如：lisi" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-password">初始密码</Label>
            <Input id="account-password" type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="至少 6 位" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-role">角色</Label>
            <select
              id="account-role"
              value={role}
              onChange={event => setRole(event.target.value as AccountRole)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="user">普通用户</option>
              <option value="admin">管理员</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4">
          {error ? <div className="text-sm text-destructive">{error}</div> : <div />}
          <Button onClick={handleCreate} disabled={loading}>
            {loading ? '创建中...' : '创建账号'}
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        {accounts.map(account => (
          <div key={account.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="font-medium">{account.display_name}</div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {account.username}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  创建时间：{account.created_at}
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <select
                  value={account.role}
                  onChange={event => handleRoleChange(account.id, event.target.value as AccountRole)}
                  className="rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="user">普通用户</option>
                  <option value="admin">管理员</option>
                </select>

                <Button
                  variant={account.is_active ? 'outline' : 'default'}
                  size="sm"
                  onClick={() => handleActiveChange(account.id, !account.is_active)}
                >
                  {account.is_active ? '停用账号' : '启用账号'}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
