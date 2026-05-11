// src/components/WhackAMoleGame.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { format, isSameMonth } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { getAvatarColor } from '@/lib/avatar';
import { X } from 'lucide-react';

interface Mole {
  id: number;
  dateStr: string;
  name: string;
  hit: boolean;
}

interface WhackAMoleGameProps {
  month: Date;
  days: Date[];
  users: { name: string }[];
  onClose: () => void;
}

const GAME_DURATION = 30;
const INITIAL_INTERVAL = 1200;
const MIN_INTERVAL = 500;
const MOLE_VISIBLE_MS = 1500;

export function WhackAMoleGame({ month, days, users, onClose }: WhackAMoleGameProps) {
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [moles, setMoles] = useState<Mole[]>([]);
  const [phase, setPhase] = useState<'countdown' | 'playing' | 'done'>('countdown');
  const [countdown, setCountdown] = useState(3);
  const [floatingScores, setFloatingScores] = useState<{ id: number; x: number; y: number; value: number }[]>([]);
  const moleIdRef = useRef(0);
  const floatIdRef = useRef(0);
  const activeMoleIds = useRef<Set<number>>(new Set());

  // 当前月的有效日期
  const validDays = days.filter(d => isSameMonth(d, month));
  const validDateStrs = validDays.map(d => format(d, 'yyyy-MM-dd'));

  // 随机获取可用的人员名字
  const namePool = users.length > 0 ? users.map(u => u.name) : ['值班员'];

  const [highScore, setHighScore] = useState(() => {
    if (typeof window === 'undefined') return 0;
    return parseInt(localStorage.getItem('whack_mole_high') || '0', 10);
  });

  // 开始倒计时
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      setPhase('playing');
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 800);
    return () => clearTimeout(timer);
  }, [phase, countdown]);

  // 游戏计时
  useEffect(() => {
    if (phase !== 'playing') return;
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          setPhase('done');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase]);

  // 生成地鼠
  useEffect(() => {
    if (phase !== 'playing') return;

    const elapsed = GAME_DURATION - timeLeft;
    const interval = Math.max(MIN_INTERVAL, INITIAL_INTERVAL - elapsed * 25);

    const spawnMole = () => {
      const id = ++moleIdRef.current;
      const dateStr = validDateStrs[Math.floor(Math.random() * validDateStrs.length)];
      const name = namePool[Math.floor(Math.random() * namePool.length)];

      activeMoleIds.current.add(id);
      setMoles(prev => [...prev, { id, dateStr, name, hit: false }]);

      // 自动消失
      setTimeout(() => {
        setMoles(prev => {
          const mole = prev.find(m => m.id === id);
          if (mole && !mole.hit) {
            setCombo(0); // 漏掉重置 combo
          }
          return prev.filter(m => m.id !== id);
        });
        activeMoleIds.current.delete(id);
      }, MOLE_VISIBLE_MS);
    };

    const timer = setInterval(spawnMole, interval);
    spawnMole();
    return () => clearInterval(timer);
  }, [phase, timeLeft]);

  // 游戏结束保存分数
  useEffect(() => {
    if (phase !== 'done') return;
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('whack_mole_high', String(score));
    }
  }, [phase, score, highScore]);

  const handleWhack = useCallback((mole: Mole, event: React.MouseEvent) => {
    if (mole.hit) return;
    setMoles(prev => prev.map(m => m.id === mole.id ? { ...m, hit: true } : m));

    const newCombo = combo + 1;
    const points = Math.min(newCombo, 5); // combo 越高分数越高，上限 5
    setCombo(newCombo);
    setMaxCombo(prev => Math.max(prev, newCombo));
    setScore(prev => prev + points);

    // 飘字效果
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const floatId = ++floatIdRef.current;
    setFloatingScores(prev => [...prev, { id: floatId, x: rect.left + rect.width / 2, y: rect.top, value: points }]);
    setTimeout(() => {
      setFloatingScores(prev => prev.filter(f => f.id !== floatId));
    }, 800);

    // 命中后快速消失
    setTimeout(() => {
      setMoles(prev => prev.filter(m => m.id !== mole.id));
    }, 200);
  }, [combo]);

  // 构建地鼠查找 map
  const moleMap = new Map<string, Mole>();
  for (const m of moles) {
    if (!m.hit) moleMap.set(m.dateStr, m);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center">
      {/* 飘字 */}
      {floatingScores.map(f => (
        <div
          key={f.id}
          className="fixed pointer-events-none text-2xl font-bold text-yellow-400 animate-bounce"
          style={{ left: f.x, top: f.y, transform: 'translate(-50%, -100%)' }}
        >
          +{f.value}
        </div>
      ))}

      <div className="bg-background rounded-2xl shadow-2xl p-6 max-w-lg w-full mx-4 space-y-4">
        {/* 头部 */}
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">
            {phase === 'countdown' && '准备...'}
            {phase === 'playing' && (
              <span className="flex items-center gap-3">
                <span className="tabular-nums">{timeLeft}s</span>
                <span className="text-yellow-500">{score} 分</span>
                {combo >= 3 && <span className="text-sm text-orange-400">Combo x{combo}!</span>}
              </span>
            )}
            {phase === 'done' && '游戏结束'}
          </div>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 倒计时 */}
        {phase === 'countdown' && (
          <div className="text-center py-12">
            <div className="text-7xl font-bold text-primary animate-pulse">
              {countdown > 0 ? countdown : '开始!'}
            </div>
            <p className="text-sm text-muted-foreground mt-4">点击弹出的名字得分</p>
          </div>
        )}

        {/* 游戏区域 */}
        {phase === 'playing' && (
          <div className="space-y-2">
            <div className="text-center text-sm text-muted-foreground">
              {format(month, 'yyyy年M月', { locale: zhCN })}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {['一', '二', '三', '四', '五', '六', '日'].map(d => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
              ))}
              {days.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const isCurrentMonth = isSameMonth(day, month);
                const mole = moleMap.get(dateStr);

                if (!isCurrentMonth) {
                  return (
                    <div key={dateStr} className="h-12 sm:h-14 rounded border border-border bg-muted/20 opacity-30" />
                  );
                }

                return (
                  <div
                    key={dateStr}
                    className={`h-12 sm:h-14 rounded border relative flex flex-col items-center justify-center transition-all duration-150 ${
                      mole
                        ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 cursor-pointer hover:scale-105'
                        : 'border-border bg-background'
                    }`}
                    onClick={mole ? (e) => handleWhack(mole, e) : undefined}
                  >
                    <span className="text-xs text-muted-foreground">{format(day, 'd')}</span>
                    {mole && (
                      <div
                        className="absolute inset-0 flex items-center justify-center animate-bounce"
                        style={{ animationDuration: '0.4s' }}
                      >
                        <span
                          className="px-1.5 py-0.5 text-xs rounded-full text-white font-bold shadow-lg"
                          style={{ backgroundColor: getAvatarColor(mole.name) }}
                        >
                          {mole.name}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 结果 */}
        {phase === 'done' && (
          <div className="text-center py-6 space-y-4">
            <div className="text-5xl font-bold text-primary">{score}</div>
            <div className="text-sm text-muted-foreground">
              最高连击: {maxCombo} | 历史最高: {highScore}
            </div>
            {score >= highScore && score > 0 && (
              <div className="text-yellow-500 font-medium">新纪录!</div>
            )}
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => {
                  setScore(0);
                  setCombo(0);
                  setMaxCombo(0);
                  setTimeLeft(GAME_DURATION);
                  setMoles([]);
                  setPhase('countdown');
                  setCountdown(3);
                }}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
              >
                再来一局
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted"
              >
                关闭
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
