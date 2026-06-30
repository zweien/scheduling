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

/** 查询跨度上限（含），用于防止超大区间触发海量节假日拉取（fan-out 滥用） */
export const MAX_STATS_SPAN_YEARS = 10;

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

/**
 * 计算某个 [start, end] 区间需要预加载节假日的年份列表。
 *
 * - 返回 [startYear-1 .. endYear+1]：holiday-cn 会把跨年边界的日期
 *   （如 2011-12-31）存进相邻年份文件（2012.json），需多加载相邻年。
 * - 跨度超过 MAX_STATS_SPAN_YEARS 返回 null（防止 ?start=0000&end=9999
 *   之类的请求触发上万次并发拉取）。
 */
export function holidayYearsForRange(start: string, end: string): number[] | null {
  const startYear = Number(start.slice(0, 4));
  const endYear = Number(end.slice(0, 4));
  if (Number.isNaN(startYear) || Number.isNaN(endYear)) return null;
  if (endYear - startYear + 1 > MAX_STATS_SPAN_YEARS) return null;

  const years = new Set<number>();
  for (let y = startYear - 1; y <= endYear + 1; y++) years.add(y);
  return [...years];
}
