// src/lib/stats-range.ts
// 纯函数：把 stats 端点的多种时间参数归一化为 [start, end] 日期范围。
// 不依赖任何第三方库，便于单元测试（含闰年 2 月末尾的边界）。

export interface StatsRangeInput {
  start?: string | null;
  end?: string | null;
  year?: string | null;
  month?: string | null;
}

export interface ResolvedRange {
  start: string;
  end: string;
}

/**
 * 解析时间范围参数，优先级：start+end > month > year。
 * 返回 null 表示参数缺失或非法（调用方应回 400）。
 */
export function resolveStatsRange(input: StatsRangeInput): ResolvedRange | null {
  const { start, end, year, month } = input;

  if (start && end) {
    return { start, end };
  }

  if (month) {
    const m = /^(\d{4})-(\d{2})$/.exec(month);
    if (!m) return null;
    const yearNum = Number(m[1]);
    const monthNum = Number(m[2]);
    if (monthNum < 1 || monthNum > 12) return null;
    // day=0 取上月最后一天 → 即本月最后一天（自动处理闰年）
    const lastDay = new Date(yearNum, monthNum, 0).getDate();
    return {
      start: `${m[1]}-${m[2]}-01`,
      end: `${m[1]}-${m[2]}-${String(lastDay).padStart(2, '0')}`,
    };
  }

  if (year) {
    if (!/^\d{4}$/.test(year)) return null;
    return { start: `${year}-01-01`, end: `${year}-12-31` };
  }

  return null;
}
