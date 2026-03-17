'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface TokenItem {
  id: number;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  disabledAt: string | null;
}

interface CreateTokenResult extends TokenItem {
  token: string;
}

interface TokenDialogProps {
  open: boolean;
  onClose: () => void;
}

export function TokenManager({ active = true }: { active?: boolean }) {
  const [tokens, setTokens] = useState<TokenItem[]>([]);
  const [tokenName, setTokenName] = useState('');
  const [latestToken, setLatestToken] = useState<CreateTokenResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadTokens() {
    const response = await fetch('/api/tokens');
    if (!response.ok) {
      return;
    }

    const body = await response.json();
    setTokens(body);
  }

  useEffect(() => {
    if (active) {
      void loadTokens();
    }
  }, [active]);

  async function handleCreate() {
    if (!tokenName.trim()) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tokenName }),
      });

      if (!response.ok) {
        return;
      }

      const body = await response.json() as CreateTokenResult;
      setLatestToken(body);
      setTokenName('');
      await loadTokens();
    } finally {
      setLoading(false);
    }
  }

  async function handleDisable(id: number) {
    setLoading(true);
    try {
      const response = await fetch(`/api/tokens/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disabled: true }),
      });

      if (!response.ok) {
        return;
      }

      await loadTokens();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 py-2">
      <section className="space-y-3 rounded-2xl border border-border bg-muted/30 p-4">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">生成新 Token</h3>
          <p className="text-xs text-muted-foreground">
            明文 token 只会展示一次，请在生成后立即保存。
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1 space-y-2">
            <Label htmlFor="token-name">Token 名称</Label>
            <Input
              id="token-name"
              value={tokenName}
              onChange={event => setTokenName(event.target.value)}
              placeholder="例如：integration-bot"
            />
          </div>
          <Button onClick={handleCreate} disabled={loading} className="sm:self-end">
            生成 Token
          </Button>
        </div>

        {latestToken && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            <div className="font-medium">新 Token</div>
            <div className="mt-1 break-all font-mono text-xs">{latestToken.token}</div>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">已有 Token</h3>
          <p className="text-xs text-muted-foreground">
            这里只显示元数据，不会再次显示明文 token。
          </p>
        </div>

        <div className="space-y-2">
          {tokens.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              暂无 Token
            </div>
          ) : (
            tokens.map(token => (
              <div
                key={token.id}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="font-medium">{token.name}</div>
                  <div className="text-xs text-muted-foreground">
                    前缀：{token.prefix} · 创建于：{token.createdAt}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    最近使用：{token.lastUsedAt ?? '尚未使用'}
                  </div>
                </div>

                {token.disabledAt ? (
                  <span className="text-xs font-medium text-amber-600">已禁用</span>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDisable(token.id)}
                    disabled={loading}
                  >
                    禁用
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

export function TokenDialog({ open, onClose }: TokenDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>API Token 管理</DialogTitle>
        </DialogHeader>
        <TokenManager active={open} />
      </DialogContent>
    </Dialog>
  );
}
