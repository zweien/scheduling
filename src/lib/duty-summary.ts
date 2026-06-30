// src/lib/duty-summary.ts
// 纯函数模块：将值班日期列表分类为「非工作日 / 法定节假日 / 调休补班」。
// 仅依赖 ./holidays（纯日期数据），不触碰数据库，便于单元测试。

import { getHolidayInfo } from './holidays';

export type RestDayType = 'holiday' | 'weekend';

export interface RestDayDetail {
  date: string;
  /** 仅法定节假日带名称；周末为 undefined（序列化时省略该字段） */
  name?: string;
  type: RestDayType;
}

export interface DutyDateSummary {
  /** 非工作日值班天数 = 法定节假日 + 周末 - 调休补班 */
  restDayCount: number;
  /** 法定节假日（非补班）值班天数 */
  holidayCount: number;
  /** 调休补班值班天数（算工作日，不归入休息日） */
  adjustedWorkdayCount: number;
  /** 非工作日值班明细，按日期升序 */
  restDays: RestDayDetail[];
}

/**
 * 对单个人员的值班日期列表做节假日维度的分类统计。
 *
 * 分类优先级：调休补班 > 法定节假日 > 普通周末。
 * 与 src/lib/holidays.ts 的 isRestDay 语义保持一致。
 */
export function summarizeDutyDates(dates: string[]): DutyDateSummary {
  const restDays: RestDayDetail[] = [];
  let holidayCount = 0;
  let adjustedWorkdayCount = 0;

  for (const date of dates) {
    const info = getHolidayInfo(date);

    // 调休补班日 → 工作日，单独计数
    if (info?.isWorkday) {
      adjustedWorkdayCount++;
      continue;
    }
    // 法定节假日（非补班）→ 休息日
    if (info && !info.isWorkday) {
      holidayCount++;
      restDays.push({ date, name: info.name, type: 'holiday' });
      continue;
    }
    // 普通周末（周六 / 周日）→ 休息日
    const day = new Date(date + 'T00:00:00').getDay();
    if (day === 0 || day === 6) {
      restDays.push({ date, type: 'weekend' });
    }
  }

  restDays.sort((a, b) => a.date.localeCompare(b.date));

  return {
    restDayCount: restDays.length,
    holidayCount,
    adjustedWorkdayCount,
    restDays,
  };
}
