'use client';

import { useState } from 'react';
import { BarChart3, CalendarRange, ClipboardList, ShieldCheck } from 'lucide-react';
import { login } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { clearQueuedSuccessToast, queueSuccessToast } from '@/lib/ui/success-toast';

const highlights = [
  {
    title: '自动排班',
    description: '按日期范围快速生成值班安排，减少重复维护。',
    icon: CalendarRange,
  },
  {
    title: '统计与日志',
    description: '查看人员分布、操作历史与关键排班变化。',
    icon: BarChart3,
  },
  {
    title: '导出与留档',
    description: '支持多种导出格式，方便归档、共享与打印。',
    icon: ClipboardList,
  },
];

interface LoginFormProps {
  registrationEnabled: boolean;
}

export function LoginForm({ registrationEnabled }: LoginFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    queueSuccessToast('登录成功');
    const result = await login(formData);
    if (result?.error) {
      clearQueuedSuccessToast();
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(73,110,255,0.18),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(47,155,170,0.2),_transparent_28%),linear-gradient(135deg,_#f3f7ff_0%,_#eef2f7_48%,_#f7fafc_100%)]">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.72)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.72)_1px,transparent_1px)] bg-[size:28px_28px] opacity-50" />
      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full items-stretch gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-slate-950 px-6 py-7 text-white shadow-[0_30px_120px_rgba(15,23,42,0.28)] sm:px-8 sm:py-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(148,163,184,0.28),_transparent_24%),radial-gradient(circle_at_bottom_left,_rgba(45,212,191,0.18),_transparent_24%)]" />
            <div className="relative flex h-full flex-col justify-between gap-10">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1 text-xs tracking-[0.24em] text-slate-200 uppercase">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Scheduling Console
                </div>
                <div className="max-w-2xl space-y-4">
                  <p className="text-sm font-medium text-cyan-200">内部值班协作平台</p>
                  <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                    值班安排，更清晰地协作。
                  </h1>
                  <p className="max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
                    为小团队提供可靠的值班编排、视图切换、统计分析与变更追踪能力，让排班从表格维护回到真正可协作的工作流。
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {highlights.map(item => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm"
                  >
                    <item.icon className="mb-3 h-5 w-5 text-cyan-200" />
                    <div className="space-y-1.5">
                      <h2 className="text-sm font-semibold">{item.title}</h2>
                      <p className="text-xs leading-5 text-slate-300">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="flex items-center">
            <Card className="w-full rounded-[2rem] border border-slate-200/80 bg-white/88 py-0 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur">
              <CardHeader className="space-y-3 border-b border-slate-200/80 px-6 py-6 sm:px-8 sm:py-7">
                <div className="inline-flex w-fit items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-medium tracking-[0.2em] text-white uppercase">
                  Team Access
                </div>
                <div className="space-y-1.5">
                  <CardTitle className="text-2xl font-semibold text-slate-950">
                    登录系统
                  </CardTitle>
                  <CardDescription className="text-sm leading-6 text-slate-600">
                    输入团队访问密码，进入排班控制台。
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="px-6 py-6 sm:px-8 sm:py-7">
                <form action={handleSubmit} className="space-y-5">
                  {error && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  <div className="space-y-2.5">
                    <Label htmlFor="username" className="text-sm font-medium text-slate-800">
                      用户名
                    </Label>
                    <Input
                      id="username"
                      name="username"
                      type="text"
                      required
                      placeholder="请输入用户名"
                      className="h-12 rounded-xl border-slate-200 bg-white text-base shadow-none focus-visible:border-slate-400 focus-visible:ring-slate-200"
                    />
                  </div>

                  <div className="space-y-2.5">
                    <Label htmlFor="password" className="text-sm font-medium text-slate-800">
                      登录密码
                    </Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      required
                      placeholder="请输入登录密码"
                      className="h-12 rounded-xl border-slate-200 bg-white text-base shadow-none focus-visible:border-slate-400 focus-visible:ring-slate-200"
                    />
                    <p className="text-xs leading-5 text-slate-500">
                      升级后的系统默认管理员账号为 `admin`，密码沿用原系统登录密码。
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="h-12 w-full rounded-xl bg-slate-950 text-sm font-medium text-white hover:bg-slate-800"
                    disabled={loading}
                  >
                    {loading ? '登录中...' : '登录系统'}
                  </Button>

                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>还没有账号？</span>
                    {registrationEnabled ? (
                      <Link href="/register" className="font-medium text-slate-950 underline-offset-4 hover:underline">
                        立即注册
                      </Link>
                    ) : (
                      <span className="text-slate-400">当前未开放注册</span>
                    )}
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
