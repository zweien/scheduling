'use client';

import { useState } from 'react';
import Link from 'next/link';
import { UserPlus, ShieldCheck } from 'lucide-react';
import { register } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface RegisterFormProps {
  registrationEnabled: boolean;
}

export function RegisterForm({ registrationEnabled }: RegisterFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setLoading(true);

    const result = await register(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(73,110,255,0.18),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(47,155,170,0.2),_transparent_28%),linear-gradient(135deg,_#f3f7ff_0%,_#eef2f7_48%,_#f7fafc_100%)]">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.72)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.72)_1px,transparent_1px)] bg-[size:28px_28px] opacity-50" />
      <div className="relative mx-auto flex min-h-screen max-w-5xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full items-stretch gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-slate-950 px-6 py-7 text-white shadow-[0_30px_120px_rgba(15,23,42,0.28)] sm:px-8 sm:py-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(148,163,184,0.28),_transparent_24%),radial-gradient(circle_at_bottom_left,_rgba(45,212,191,0.18),_transparent_24%)]" />
            <div className="relative flex h-full flex-col justify-between gap-8">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1 text-xs tracking-[0.24em] text-slate-200 uppercase">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Account Registration
                </div>
                <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                  创建个人账号，进入排班工作台。
                </h1>
                <p className="max-w-md text-sm leading-7 text-slate-300 sm:text-base">
                  注册开启时，团队成员可以创建自己的普通账号。管理员可在后台统一管理角色、启停状态与注册开关。
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
                <div className="flex items-start gap-3">
                  <UserPlus className="mt-0.5 h-5 w-5 text-cyan-200" />
                  <div className="space-y-1">
                    <h2 className="text-sm font-semibold">注册后默认权限</h2>
                    <p className="text-xs leading-5 text-slate-300">
                      新账号默认是普通用户，可查看排班、统计、日志、导出与打印，但不能修改排班或管理系统配置。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="flex items-center">
            <Card className="w-full rounded-[2rem] border border-slate-200/80 bg-white/88 py-0 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur">
              <CardHeader className="space-y-3 border-b border-slate-200/80 px-6 py-6 sm:px-8 sm:py-7">
                <div className="inline-flex w-fit items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-medium tracking-[0.2em] text-white uppercase">
                  Team Register
                </div>
                <div className="space-y-1.5">
                  <CardTitle className="text-2xl font-semibold text-slate-950">
                    注册账号
                  </CardTitle>
                  <CardDescription className="text-sm leading-6 text-slate-600">
                    {registrationEnabled ? '填写账号信息，注册成功后将自动登录。' : '当前管理员未开放注册，请联系管理员。'}
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="px-6 py-6 sm:px-8 sm:py-7">
                <form action={handleSubmit} className="space-y-5">
                  {error ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {error}
                    </div>
                  ) : null}

                  <div className="space-y-2.5">
                    <Label htmlFor="displayName">显示名称</Label>
                    <Input id="displayName" name="displayName" required placeholder="例如：张三" disabled={!registrationEnabled} />
                  </div>

                  <div className="space-y-2.5">
                    <Label htmlFor="username">用户名</Label>
                    <Input id="username" name="username" required placeholder="例如：zhangsan" disabled={!registrationEnabled} />
                  </div>

                  <div className="space-y-2.5">
                    <Label htmlFor="password">密码</Label>
                    <Input id="password" name="password" type="password" required placeholder="至少 6 位" disabled={!registrationEnabled} />
                  </div>

                  <div className="space-y-2.5">
                    <Label htmlFor="confirmPassword">确认密码</Label>
                    <Input id="confirmPassword" name="confirmPassword" type="password" required placeholder="再次输入密码" disabled={!registrationEnabled} />
                  </div>

                  <Button type="submit" className="h-12 w-full rounded-xl bg-slate-950 text-sm font-medium text-white hover:bg-slate-800" disabled={loading || !registrationEnabled}>
                    {loading ? '注册中...' : '注册并进入系统'}
                  </Button>

                  <div className="text-sm text-slate-600">
                    已有账号？
                    <Link href="/" className="ml-2 font-medium text-slate-950 underline-offset-4 hover:underline">
                      返回登录
                    </Link>
                  </div>
                </form>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}

