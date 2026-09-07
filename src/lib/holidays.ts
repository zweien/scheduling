// src/lib/holidays.ts
// 中国法定节假日数据，每年更新一次
// 数据来源：国务院办公厅关于2026年部分节假日安排的通知

export interface HolidayInfo {
  name: string;
  date: string;       // 假期日期（含调休延伸的日期）
  isWorkday?: boolean; // 调休补班日
}

/** holiday-cn 数据源的原始条目形状 */
interface HolidayCnDay {
  name: string;
  date: string;
  isOffDay: boolean; // true=放假，false=调休补班
}

const holidays: HolidayInfo[] = [
  // === 2025 年 ===
  // 元旦
  { name: '元旦', date: '2025-01-01' },

  // 春节
  { name: '春节', date: '2025-01-28' },
  { name: '春节', date: '2025-01-29' },
  { name: '春节', date: '2025-01-30' },
  { name: '春节', date: '2025-01-31' },
  { name: '春节', date: '2025-02-01' },
  { name: '春节', date: '2025-02-02' },
  { name: '春节', date: '2025-02-03' },
  { name: '春节', date: '2025-02-04' },
  { name: '春节', date: '2025-01-26', isWorkday: true },
  { name: '春节', date: '2025-02-08', isWorkday: true },

  // 清明节
  { name: '清明节', date: '2025-04-04' },
  { name: '清明节', date: '2025-04-05' },
  { name: '清明节', date: '2025-04-06' },

  // 劳动节
  { name: '劳动节', date: '2025-05-01' },
  { name: '劳动节', date: '2025-05-02' },
  { name: '劳动节', date: '2025-05-03' },
  { name: '劳动节', date: '2025-05-04' },
  { name: '劳动节', date: '2025-05-05' },
  { name: '劳动节', date: '2025-04-27', isWorkday: true },

  // 端午节
  { name: '端午节', date: '2025-05-31' },
  { name: '端午节', date: '2025-06-01' },
  { name: '端午节', date: '2025-06-02' },

  // 中秋节 + 国庆节
  { name: '中秋节', date: '2025-10-01' },
  { name: '国庆节', date: '2025-10-02' },
  { name: '国庆节', date: '2025-10-03' },
  { name: '国庆节', date: '2025-10-04' },
  { name: '国庆节', date: '2025-10-05' },
  { name: '国庆节', date: '2025-10-06' },
  { name: '国庆节', date: '2025-10-07' },
  { name: '国庆节', date: '2025-10-08' },
  { name: '国庆节', date: '2025-09-28', isWorkday: true },
  { name: '国庆节', date: '2025-10-11', isWorkday: true },

  // === 2026 年 ===
  // 元旦：1月1日至3日放假调休，共3天。1月4日（周日）补班
  { name: '元旦', date: '2026-01-01' },
  { name: '元旦', date: '2026-01-02' },
  { name: '元旦', date: '2026-01-03' },
  { name: '元旦', date: '2026-01-04', isWorkday: true },

  // 春节：2月15日至23日放假调休，共9天。2月14日、2月28日补班
  { name: '春节', date: '2026-02-15' },
  { name: '春节', date: '2026-02-16' },
  { name: '春节', date: '2026-02-17' },
  { name: '春节', date: '2026-02-18' },
  { name: '春节', date: '2026-02-19' },
  { name: '春节', date: '2026-02-20' },
  { name: '春节', date: '2026-02-21' },
  { name: '春节', date: '2026-02-22' },
  { name: '春节', date: '2026-02-23' },
  { name: '春节', date: '2026-02-14', isWorkday: true },
  { name: '春节', date: '2026-02-28', isWorkday: true },

  // 清明节：4月4日至6日放假，共3天
  { name: '清明节', date: '2026-04-04' },
  { name: '清明节', date: '2026-04-05' },
  { name: '清明节', date: '2026-04-06' },

  // 劳动节：5月1日至5月5日放假调休，共5天。5月9日（周六）补班
  { name: '劳动节', date: '2026-05-01' },
  { name: '劳动节', date: '2026-05-02' },
  { name: '劳动节', date: '2026-05-03' },
  { name: '劳动节', date: '2026-05-04' },
  { name: '劳动节', date: '2026-05-05' },
  { name: '劳动节', date: '2026-05-09', isWorkday: true },

  // 端午节：6月19日至21日放假，共3天
  { name: '端午节', date: '2026-06-19' },
  { name: '端午节', date: '2026-06-20' },
  { name: '端午节', date: '2026-06-21' },

  // 中秋节：9月25日至27日放假，共3天
  { name: '中秋节', date: '2026-09-25' },
  { name: '中秋节', date: '2026-09-26' },
  { name: '中秋节', date: '2026-09-27' },

  // 国庆节：10月1日至7日放假调休，共7天。9月20日（周日）、10月10日（周六）补班
  { name: '国庆节', date: '2026-10-01' },
  { name: '国庆节', date: '2026-10-02' },
  { name: '国庆节', date: '2026-10-03' },
  { name: '国庆节', date: '2026-10-04' },
  { name: '国庆节', date: '2026-10-05' },
  { name: '国庆节', date: '2026-10-06' },
  { name: '国庆节', date: '2026-10-07' },
  { name: '国庆节', date: '2026-09-20', isWorkday: true },
  { name: '国庆节', date: '2026-10-10', isWorkday: true },
];

// 按日期索引的 Map，快速查询
const holidayMap = new Map<string, HolidayInfo>();
for (const h of holidays) {
  holidayMap.set(h.date, h);
}

// --- 动态拉取的节假日（运行时覆盖静态基线，拉取失败自动回退） ---
// 数据源：NateScarlet/holiday-cn（基于国务院办公厅通知，MIT 协议）
const dynamicHolidayMap = new Map<string, HolidayInfo>();
const loadedYears = new Set<number>();
const HOLIDAY_CN_BASE = 'https://cdn.jsdelivr.net/gh/NateScarlet/holiday-cn@master';

/** 把 holiday-cn 的 days 数组解析为 HolidayInfo[]（纯函数，便于单元测试） */
export function parseHolidayCnDays(days: unknown): HolidayInfo[] {
  if (!Array.isArray(days)) return [];
  const result: HolidayInfo[] = [];
  for (const d of days) {
    if (!d || typeof d !== 'object') continue;
    const day = d as HolidayCnDay;
    if (
      typeof day.name !== 'string' ||
      typeof day.date !== 'string' ||
      typeof day.isOffDay !== 'boolean' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(day.date)
    ) {
      continue;
    }
    result.push(day.isOffDay ? { name: day.name, date: day.date } : { name: day.name, date: day.date, isWorkday: true });
  }
  return result;
}

/** 拉取某一年的法定节假日（best-effort：失败返回 null，不抛错） */
export async function fetchHolidaysForYear(year: number, timeoutMs = 3000): Promise<HolidayInfo[] | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`${HOLIDAY_CN_BASE}/${year}.json`, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const json = (await res.json()) as { days?: unknown };
    return parseHolidayCnDays(json.days);
  } catch {
    return null;
  }
}

/** 确保给定年份的节假日已加载到动态缓存（best-effort；拉取失败的年份下次请求会重试） */
export async function ensureHolidaysLoaded(years: number[]): Promise<void> {
  const missing = years.filter(y => !loadedYears.has(y));
  if (missing.length === 0) return;
  await Promise.all(
    missing.map(async year => {
      const days = await fetchHolidaysForYear(year);
      if (days === null) return; // 拉取失败：不标记为已加载，下次请求重试
      loadedYears.add(year);
      for (const d of days) dynamicHolidayMap.set(d.date, d);
    }),
  );
}

/** 查询某日期是否为法定节假日（优先动态拉取数据，回退到静态基线） */
export function getHolidayInfo(date: string): HolidayInfo | undefined {
  return dynamicHolidayMap.get(date) ?? holidayMap.get(date);
}

/** 判断某日期是否为法定节假日（非补班日） */
export function isHoliday(date: string): boolean {
  const info = holidayMap.get(date);
  return info !== undefined && !info.isWorkday;
}

/** 判断某日期是否为调休补班日 */
export function isAdjustedWorkday(date: string): boolean {
  return holidayMap.get(date)?.isWorkday === true;
}

/** 判断某日期是否为休息日（非工作日）= 法定节假日 + 普通周末 - 调休补班日 */
export function isRestDay(date: string): boolean {
  // 调休补班日 → 工作日
  if (isAdjustedWorkday(date)) return false;
  // 法定节假日 → 休息日
  if (isHoliday(date)) return true;
  // 普通周末（周六日）→ 休息日
  const d = new Date(date + 'T00:00:00');
  const day = d.getDay();
  return day === 0 || day === 6;
}

/** 获取节假日名称 */
export function getHolidayName(date: string): string | undefined {
  return holidayMap.get(date)?.name;
}

/** 从日期列表中筛选出休息日值班日期 */
export function filterRestDayDates(dates: string[]): string[] {
  return dates.filter(d => isRestDay(d));
}

/** 统计休息日（节假日+周末）值班次数 */
export function countRestDayDuty(dates: string[]): number {
  return dates.filter(d => isRestDay(d)).length;
}
