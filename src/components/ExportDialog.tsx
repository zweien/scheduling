// src/components/ExportDialog.tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { exportToCSV, exportToJSON, exportToXLSX } from '@/app/actions/export';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ExportPanel() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleExportCSV() {
    if (!startDate || !endDate) {
      alert('请选择日期范围');
      return;
    }
    setLoading(true);
    try {
      const csv = await exportToCSV(startDate, endDate);
      downloadFile(csv, `排班表_${startDate}_${endDate}.csv`, 'text/csv');
    } catch {
      alert('导出失败');
    }
    setLoading(false);
  }

  async function handleExportJSON() {
    if (!startDate || !endDate) {
      alert('请选择日期范围');
      return;
    }
    setLoading(true);
    try {
      const json = await exportToJSON(startDate, endDate);
      downloadFile(json, `排班表_${startDate}_${endDate}.json`, 'application/json');
    } catch {
      alert('导出失败');
    }
    setLoading(false);
  }

  async function handleExportXLSX() {
    if (!startDate || !endDate) {
      alert('请选择日期范围');
      return;
    }
    setLoading(true);
    try {
      const xlsx = await exportToXLSX(startDate, endDate);
      downloadBinaryFile(xlsx.content, xlsx.fileName, xlsx.mimeType);
    } catch {
      alert('导出失败');
    }
    setLoading(false);
  }

  function downloadFile(content: string, filename: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadBinaryFile(base64: string, filename: string, type: string) {
    const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
    const blob = new Blob([bytes], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
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

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Button
          onClick={handleExportCSV}
          disabled={loading}
          className="flex-1"
        >
          导出 CSV
        </Button>
        <Button
          onClick={handleExportJSON}
          disabled={loading}
          variant="outline"
          className="flex-1"
        >
          导出 JSON
        </Button>
        <Button
          onClick={handleExportXLSX}
          disabled={loading}
          variant="outline"
          className="flex-1"
        >
          导出 XLSX
        </Button>
      </div>
    </div>
  );
}

export function ExportDialog({ open, onClose }: ExportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm w-[calc(100%-2rem)]">
        <DialogHeader>
          <DialogTitle>导出排班表</DialogTitle>
        </DialogHeader>
        <ExportPanel />
      </DialogContent>
    </Dialog>
  );
}
