// src/components/PrintDialog.tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { getSchedules } from '@/app/actions/schedule';
import type { ScheduleWithUser } from '@/types';
import {
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface PrintDialogProps {
  open: boolean;
  onClose: () => void;
}

type PrintMode = 'list' | 'calendar';

interface CalendarMonthPreviewProps {
  month: Date;
  schedulesByDate: Map<string, ScheduleWithUser>;
  rangeStart: Date;
  rangeEnd: Date;
}

function CalendarMonthPreview({
  month,
  schedulesByDate,
  rangeStart,
  rangeEnd,
}: CalendarMonthPreviewProps) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  return (
    <section className="print-calendar-month space-y-2 break-inside-avoid">
      <h3 className="text-base font-semibold text-center">
        {format(month, 'yyyy年M月', { locale: zhCN })}
      </h3>
      <div className="grid grid-cols-7 gap-1">
        {['一', '二', '三', '四', '五', '六', '日'].map(day => (
          <div
            key={day}
            className="rounded border bg-muted px-2 py-1 text-center text-xs font-medium text-muted-foreground print:bg-gray-200"
          >
            {day}
          </div>
        ))}
        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const schedule = schedulesByDate.get(dateStr);
          const inSelectedRange = day >= rangeStart && day <= rangeEnd;
          const isCurrentMonth = day.getMonth() === month.getMonth();

          return (
            <div
              key={dateStr}
              className={[
                'min-h-[96px] rounded border px-2 py-2 text-xs print:min-h-[88px]',
                inSelectedRange && isCurrentMonth
                  ? 'bg-background'
                  : 'bg-muted/25 text-muted-foreground',
              ].join(' ')}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium">{format(day, 'd')}</span>
                {schedule?.is_manual ? (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800 print:border print:border-amber-800 print:bg-transparent">
                    手动
                  </span>
                ) : null}
              </div>
              {inSelectedRange && isCurrentMonth ? (
                <div className="space-y-1">
                  <div className="font-medium">{schedule?.user.name || '-'}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {format(day, 'EEEE', { locale: zhCN })}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

interface PrintPanelProps {
  onClose?: () => void;
}

export function PrintPanel({ onClose }: PrintPanelProps) {
  const defaultDates = getDefaultPrintDates();
  const [startDate, setStartDate] = useState(defaultDates.startDate);
  const [endDate, setEndDate] = useState(defaultDates.endDate);
  const [schedules, setSchedules] = useState<ScheduleWithUser[]>([]);
  const [preview, setPreview] = useState(false);
  const [printMode, setPrintMode] = useState<PrintMode>('list');

  async function handlePreview() {
    if (!startDate || !endDate) return;
    const data = await getSchedules(startDate, endDate);
    setSchedules(data);
    setPreview(true);
  }

  function handlePrint() {
    if (!rangeStart || !rangeEnd) {
      return;
    }

    const html = buildPrintDocument({
      startDate,
      endDate,
      printMode,
      dateRange,
      monthRange,
      schedulesByDate,
      rangeStart,
      rangeEnd,
    });

    const printWindow = window.open('', '_blank');

    if (!printWindow) {
      fallbackPrintDocument(html);
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  }

  function handleClose() {
    const nextDefaults = getDefaultPrintDates();
    setStartDate(nextDefaults.startDate);
    setEndDate(nextDefaults.endDate);
    setSchedules([]);
    setPreview(false);
    setPrintMode('list');
    onClose?.();
  }

  const dateRange = startDate && endDate
    ? eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) })
    : [];
  const monthRange = startDate && endDate
    ? eachMonthOfInterval({ start: parseISO(startDate), end: parseISO(endDate) })
    : [];
  const schedulesByDate = new Map(schedules.map(schedule => [schedule.date, schedule]));
  const rangeStart = startDate ? parseISO(startDate) : null;
  const rangeEnd = endDate ? parseISO(endDate) : null;

  return (
    <>
      {!preview ? (
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>开始日期</Label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full border rounded px-3 py-2 bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label>结束日期</Label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full border rounded px-3 py-2 bg-background"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>打印模式</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={printMode === 'list' ? 'default' : 'outline'}
                onClick={() => setPrintMode('list')}
              >
                列表模式
              </Button>
              <Button
                type="button"
                variant={printMode === 'calendar' ? 'default' : 'outline'}
                onClick={() => setPrintMode('calendar')}
              >
                日历模式
              </Button>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            {onClose ? (
              <Button variant="outline" onClick={handleClose}>取消</Button>
            ) : null}
            <Button onClick={handlePreview}>预览</Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="print-area print:p-4">
            <div className="hidden print:block mb-4">
              <h2 className="text-xl font-bold text-center">值班排班表</h2>
              <p className="text-center text-muted-foreground">
                {startDate} 至 {endDate}
              </p>
            </div>
            <div className="mb-4 flex items-center justify-between print:hidden">
              <div>
                <p className="text-sm font-medium">预览模式</p>
                <p className="text-sm text-muted-foreground">
                  {printMode === 'list' ? '列表模式' : '日历模式'}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setPreview(false)}>
                返回设置
              </Button>
            </div>

            {printMode === 'list' ? (
              <table className="w-full border-collapse print:border text-sm">
                <thead>
                  <tr className="bg-muted print:bg-gray-200">
                    <th className="border px-2 py-1 text-left">日期</th>
                    <th className="border px-2 py-1 text-left">星期</th>
                    <th className="border px-2 py-1 text-left">值班人员</th>
                    <th className="border px-2 py-1 text-left">备注</th>
                  </tr>
                </thead>
                <tbody>
                  {dateRange.map(date => {
                    const dateStr = format(date, 'yyyy-MM-dd');
                    const schedule = schedulesByDate.get(dateStr);
                    return (
                      <tr key={dateStr} className="print:h-8">
                        <td className="border px-2 py-1">{format(date, 'M月d日')}</td>
                        <td className="border px-2 py-1">{format(date, 'EEEE', { locale: zhCN })}</td>
                        <td className="border px-2 py-1">{schedule?.user.name || '-'}</td>
                        <td className="border px-2 py-1">{schedule?.is_manual ? '手动调整' : ''}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : rangeStart && rangeEnd ? (
              <div className="-mx-2 overflow-x-auto px-2 pb-2" data-testid="print-calendar-preview">
                <div className="print-calendar-layout min-w-[980px] grid grid-cols-1 gap-6 xl:grid-cols-2">
                  {monthRange.map(month => (
                    <CalendarMonthPreview
                      key={format(month, 'yyyy-MM')}
                      month={month}
                      schedulesByDate={schedulesByDate}
                      rangeStart={rangeStart}
                      rangeEnd={rangeEnd}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex gap-2 justify-end mt-4 print:hidden">
            <Button onClick={handlePrint}>打印</Button>
          </div>
        </div>
      )}
    </>
  );
}

export function PrintDialog({ open, onClose }: PrintDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="print-dialog-content max-w-6xl w-[calc(100%-2rem)] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>打印排班表</DialogTitle>
        </DialogHeader>
        <PrintPanel onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}

function getDefaultPrintDates() {
  const today = new Date();

  return {
    startDate: format(today, 'yyyy-MM-01'),
    endDate: format(new Date(today.getFullYear(), today.getMonth() + 1, 0), 'yyyy-MM-dd'),
  };
}

interface PrintDocumentOptions {
  startDate: string;
  endDate: string;
  printMode: PrintMode;
  dateRange: Date[];
  monthRange: Date[];
  schedulesByDate: Map<string, ScheduleWithUser>;
  rangeStart: Date;
  rangeEnd: Date;
}

function buildPrintDocument({
  startDate,
  endDate,
  printMode,
  dateRange,
  monthRange,
  schedulesByDate,
  rangeStart,
  rangeEnd,
}: PrintDocumentOptions) {
  const bodyContent = printMode === 'list'
    ? buildListPrintMarkup(dateRange, schedulesByDate)
    : buildCalendarPrintMarkup(monthRange, schedulesByDate, rangeStart, rangeEnd);

  return `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <title>值班排班表</title>
    <style>
      @page {
        size: A4 ${printMode === 'calendar' ? 'landscape' : 'portrait'};
        margin: 10mm;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        color: #111827;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .sheet {
        width: 100%;
      }

      .header {
        margin-bottom: 16px;
        text-align: center;
      }

      .header h1 {
        margin: 0;
        font-size: 20px;
      }

      .header p {
        margin: 6px 0 0;
        color: #6b7280;
        font-size: 13px;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
      }

      th,
      td {
        border: 1px solid #111827;
        padding: 6px 8px;
        text-align: left;
        vertical-align: top;
      }

      th {
        background: #e5e7eb;
      }

      .calendar-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
        align-items: start;
      }

      .calendar-month {
        break-inside: avoid;
        page-break-inside: avoid;
      }

      .calendar-month h2 {
        margin: 0 0 8px;
        text-align: center;
        font-size: 16px;
      }

      .calendar-table {
        table-layout: fixed;
      }

      .calendar-table th,
      .calendar-table td {
        width: 14.285%;
      }

      .calendar-cell {
        min-height: 92px;
        padding: 6px;
      }

      .calendar-cell.muted {
        background: #f3f4f6;
        color: #9ca3af;
      }

      .day-number {
        margin-bottom: 8px;
        font-weight: 700;
      }

      .schedule-name {
        font-weight: 600;
        line-height: 1.3;
      }

      .schedule-meta {
        margin-top: 4px;
        color: #6b7280;
        font-size: 11px;
      }

      .manual-tag {
        display: inline-block;
        margin-top: 6px;
        border: 1px solid #92400e;
        border-radius: 999px;
        padding: 1px 6px;
        color: #92400e;
        font-size: 10px;
      }
    </style>
  </head>
  <body>
    <main class="sheet">
      <header class="header">
        <h1>值班排班表</h1>
        <p>${escapeHtml(startDate)} 至 ${escapeHtml(endDate)}</p>
      </header>
      ${bodyContent}
    </main>
  </body>
</html>`;
}

function fallbackPrintDocument(html: string) {
  const frame = document.createElement('iframe');
  frame.style.position = 'fixed';
  frame.style.right = '0';
  frame.style.bottom = '0';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  frame.setAttribute('aria-hidden', 'true');

  document.body.appendChild(frame);

  const frameWindow = frame.contentWindow;

  if (!frameWindow) {
    document.body.removeChild(frame);
    alert('无法打开打印窗口，请检查浏览器弹窗设置');
    return;
  }

  frameWindow.document.open();
  frameWindow.document.write(html);
  frameWindow.document.close();
  frameWindow.focus();

  frame.onload = () => {
    frameWindow.print();
    window.setTimeout(() => {
      document.body.removeChild(frame);
    }, 1000);
  };
}

function buildListPrintMarkup(
  dateRange: Date[],
  schedulesByDate: Map<string, ScheduleWithUser>,
) {
  const rows = dateRange.map(date => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const schedule = schedulesByDate.get(dateStr);

    return `<tr>
      <td>${escapeHtml(format(date, 'M月d日'))}</td>
      <td>${escapeHtml(format(date, 'EEEE', { locale: zhCN }))}</td>
      <td>${escapeHtml(schedule?.user.name || '-')}</td>
      <td>${schedule?.is_manual ? '手动调整' : ''}</td>
    </tr>`;
  }).join('');

  return `<table>
    <thead>
      <tr>
        <th>日期</th>
        <th>星期</th>
        <th>值班人员</th>
        <th>备注</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function buildCalendarPrintMarkup(
  monthRange: Date[],
  schedulesByDate: Map<string, ScheduleWithUser>,
  rangeStart: Date,
  rangeEnd: Date,
) {
  const months = monthRange.map(month => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    const cells = days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const schedule = schedulesByDate.get(dateStr);
      const inSelectedRange = day >= rangeStart && day <= rangeEnd;
      const isCurrentMonth = day.getMonth() === month.getMonth();
      const cellClass = inSelectedRange && isCurrentMonth ? 'calendar-cell' : 'calendar-cell muted';

      return `<td>
        <div class="${cellClass}">
          <div class="day-number">${escapeHtml(format(day, 'd'))}</div>
          ${inSelectedRange && isCurrentMonth ? `
            <div class="schedule-name">${escapeHtml(schedule?.user.name || '-')}</div>
            <div class="schedule-meta">${escapeHtml(format(day, 'EEEE', { locale: zhCN }))}</div>
            ${schedule?.is_manual ? '<div class="manual-tag">手动调整</div>' : ''}
          ` : ''}
        </div>
      </td>`;
    });

    const rows = [];
    for (let index = 0; index < cells.length; index += 7) {
      rows.push(`<tr>${cells.slice(index, index + 7).join('')}</tr>`);
    }

    return `<section class="calendar-month">
      <h2>${escapeHtml(format(month, 'yyyy年M月', { locale: zhCN }))}</h2>
      <table class="calendar-table">
        <thead>
          <tr>
            <th>一</th>
            <th>二</th>
            <th>三</th>
            <th>四</th>
            <th>五</th>
            <th>六</th>
            <th>日</th>
          </tr>
        </thead>
        <tbody>${rows.join('')}</tbody>
      </table>
    </section>`;
  }).join('');

  return `<div class="calendar-grid">${months}</div>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
