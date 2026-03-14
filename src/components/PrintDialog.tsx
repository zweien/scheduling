// src/components/PrintDialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { getSchedules } from '@/app/actions/schedule';
import type { ScheduleWithUser } from '@/types';
import { format, parseISO, eachDayOfInterval } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface PrintDialogProps {
  open: boolean;
  onClose: () => void;
}

export function PrintDialog({ open, onClose }: PrintDialogProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [schedules, setSchedules] = useState<ScheduleWithUser[]>([]);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (open) {
      const today = new Date();
      const start = format(today, 'yyyy-MM-01');
      const end = format(new Date(today.getFullYear(), today.getMonth() + 1, 0), 'yyyy-MM-dd');
      setStartDate(start);
      setEndDate(end);
    }
  }, [open]);

  async function handlePreview() {
    if (!startDate || !endDate) return;
    const data = await getSchedules(startDate, endDate);
    setSchedules(data);
    setPreview(true);
  }

  function handlePrint() {
    window.print();
  }

  const dateRange = startDate && endDate
    ? eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) })
    : [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-[calc(100%-2rem)] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>打印排班表</DialogTitle>
        </DialogHeader>

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

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={onClose}>取消</Button>
              <Button onClick={handlePreview}>预览</Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <div className="print:p-4">
              <div className="hidden print:block mb-4">
                <h2 className="text-xl font-bold text-center">值班排班表</h2>
                <p className="text-center text-muted-foreground">
                  {startDate} 至 {endDate}
                </p>
              </div>

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
                    const schedule = schedules.find(s => s.date === dateStr);
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
            </div>

            <div className="flex gap-2 justify-end mt-4 print:hidden">
              <Button variant="outline" onClick={() => setPreview(false)}>返回</Button>
              <Button onClick={handlePrint}>打印</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
