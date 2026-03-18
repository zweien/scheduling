'use client';

import { useState } from 'react';
import { downloadScheduleTemplateAction, importScheduleAction, previewScheduleImportAction } from '@/app/actions/schedule';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ScheduleImportPreview, ScheduleImportStrategy, ScheduleImportTemplateType } from '@/types';

interface ScheduleImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImported?: () => void;
}

const STRATEGY_OPTIONS: Array<{ value: ScheduleImportStrategy; label: string; description: string }> = [
  { value: 'skip', label: '跳过已有日期', description: '保留系统已有排班，只导入无冲突日期。' },
  { value: 'overwrite', label: '覆盖已有日期', description: '用导入文件覆盖系统中已有排班。' },
  { value: 'mark_conflicts', label: '仅标记冲突，不执行导入', description: '只生成冲突清单，不写入数据库。' },
];

const TEMPLATE_OPTIONS: Array<{ value: ScheduleImportTemplateType; label: string; description: string }> = [
  { value: 'standard', label: '标准模板', description: '适用于按行填写 日期、值班员、手动调整、备注 的标准模板。' },
  { value: 'calendar', label: '月历模板', description: '适用于每周两行：上行日期、下行值班员的单月月历模板。' },
];

export function ScheduleImportDialog({ open, onClose, onImported }: ScheduleImportDialogProps) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [templateType, setTemplateType] = useState<ScheduleImportTemplateType>('standard');
  const [calendarTemplateMonth, setCalendarTemplateMonth] = useState(currentMonth);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ScheduleImportPreview | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [conflictStrategy, setConflictStrategy] = useState<ScheduleImportStrategy>('skip');
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);

  function resetState() {
    setTemplateType('standard');
    setCalendarTemplateMonth(currentMonth);
    setSelectedFile(null);
    setPreview(null);
    setImportError(null);
    setImportSummary(null);
    setConflictStrategy('skip');
    setValidating(false);
    setImporting(false);
  }

  function handleClose() {
    resetState();
    onClose();
  }

  async function fileToBase64(file: File) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = '';
    bytes.forEach(byte => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  }

  function downloadBinaryFile(base64: string, filename: string, type: string) {
    const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
    const blob = new Blob([bytes], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleDownloadTemplate() {
    const file = await downloadScheduleTemplateAction(
      templateType,
      templateType === 'calendar' ? calendarTemplateMonth : undefined
    );
    downloadBinaryFile(file.content, file.fileName, file.mimeType);
  }

  async function handlePreviewImport() {
    if (!selectedFile) {
      setImportError('请先选择导入文件');
      return;
    }

    setValidating(true);
    setImportError(null);
    setImportSummary(null);

    const base64 = await fileToBase64(selectedFile);
    const result = await previewScheduleImportAction(base64, templateType);
    setPreview(result);
    setValidating(false);

    if (result.issues.length > 0) {
      setImportError('导入文件存在错误，请先修正');
      return;
    }

    if (result.conflicts.length > 0) {
      setImportSummary(`检测到 ${result.conflicts.length} 条系统内冲突记录`);
      return;
    }

    setImportSummary(`文件校验通过，可导入 ${result.cleanRows} 条排班`);
  }

  async function handleImport() {
    if (!selectedFile) {
      setImportError('请先选择导入文件');
      return;
    }

    setImporting(true);
    setImportError(null);

    const base64 = await fileToBase64(selectedFile);
    const result = await importScheduleAction(base64, conflictStrategy, templateType);
    setImporting(false);

    if (!result.success) {
      setPreview(result.preview ?? null);
      setImportSummary(null);
      setImportError(result.error ?? '导入失败');
      return;
    }

    if (result.markedOnly) {
      setImportSummary('已生成冲突清单，本次未执行导入');
      return;
    }

    setImportSummary(`导入完成：成功 ${result.importedCount} 条，跳过 ${result.skippedCount} 条，覆盖 ${result.overwrittenCount} 条，冲突 ${result.conflictCount} 条`);
    onImported?.();
  }

  const hasBlockingIssues = !preview || preview.issues.length > 0;
  const hasConflicts = (preview?.conflicts.length ?? 0) > 0;

  return (
    <Dialog open={open} onOpenChange={nextOpen => {
      if (!nextOpen) {
        handleClose();
      }
    }}>
      <DialogContent className="max-h-[calc(100vh-2rem)] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>导入排班</DialogTitle>
          <DialogDescription>
            下载模板后上传 `.xlsx` 文件，系统会先校验格式、重复日期和系统内冲突。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-3">
            <Label>模板类型</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {TEMPLATE_OPTIONS.map(option => (
                <label key={option.value} className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-background px-3 py-3 text-sm">
                  <input
                    type="radio"
                    name="schedule-import-template-type"
                    checked={templateType === option.value}
                    onChange={() => {
                      setTemplateType(option.value);
                      setPreview(null);
                      setImportError(null);
                      setImportSummary(null);
                    }}
                    aria-label={option.label}
                    className="mt-1"
                  />
                  <span className="space-y-1">
                    <span className="block font-medium">{option.label}</span>
                    <span className="block text-muted-foreground">{option.description}</span>
                  </span>
                </label>
              ))}
            </div>
            {templateType === 'calendar' ? (
              <div className="space-y-3 rounded-lg border border-border bg-muted/30 px-3 py-3 text-sm text-muted-foreground">
                <div>每周两行：上行日期，下行值班员。首周和末周可以不是完整 7 列，日期支持 Excel 序列号。</div>
                <div className="space-y-2">
                  <Label htmlFor="calendar-template-month">模板月份</Label>
                  <Input
                    id="calendar-template-month"
                    type="month"
                    value={calendarTemplateMonth}
                    onChange={event => setCalendarTemplateMonth(event.target.value)}
                    className="max-w-xs bg-background"
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 lg:grid-cols-[auto_1fr_auto_auto] lg:items-end">
            <div>
              <Button variant="outline" onClick={() => void handleDownloadTemplate()}>
                下载模板
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="schedule-import-file">导入文件</Label>
              <Input
                id="schedule-import-file"
                type="file"
                accept=".xlsx"
                onChange={event => {
                  setSelectedFile(event.target.files?.[0] ?? null);
                  setPreview(null);
                  setImportError(null);
                  setImportSummary(null);
                }}
              />
            </div>
            <Button variant="outline" onClick={() => void handlePreviewImport()} disabled={validating}>
              {validating ? '校验中...' : '校验文件'}
            </Button>
            <Button onClick={() => void handleImport()} disabled={importing || hasBlockingIssues}>
              {importing ? '导入中...' : '开始导入'}
            </Button>
          </div>

          <div className="space-y-2 text-sm">
            {selectedFile ? <div className="text-muted-foreground">已选择文件：{selectedFile.name}</div> : null}
            {importError ? <div className="text-destructive">{importError}</div> : null}
            {importSummary ? <div className="text-emerald-700">{importSummary}</div> : null}
          </div>

          {preview ? (
            <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
                <div>总行数：{preview.totalRows}</div>
                <div>有效行：{preview.validRows}</div>
                <div>错误行：{preview.invalidRows}</div>
                <div>重复行：{preview.duplicateRows}</div>
                <div>冲突行：{preview.conflictRows}</div>
                <div>可导入：{preview.cleanRows}</div>
              </div>

              {preview.issues.length > 0 ? (
                <div className="space-y-2">
                  <div className="font-medium text-destructive">校验错误</div>
                  {preview.issues.map(issue => (
                    <div key={`${issue.row}-${issue.field}-${issue.message}`} className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                      第 {issue.row} 行，{issue.field}：{issue.message}
                    </div>
                  ))}
                </div>
              ) : null}

              {hasConflicts ? (
                <div className="space-y-3">
                  <div className="font-medium">冲突处理</div>
                  <div className="space-y-2">
                    {STRATEGY_OPTIONS.map(option => (
                      <label key={option.value} className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-background px-3 py-3 text-sm">
                        <input
                          type="radio"
                          name="schedule-import-strategy"
                          checked={conflictStrategy === option.value}
                          onChange={() => setConflictStrategy(option.value)}
                          aria-label={option.label}
                          className="mt-1"
                        />
                        <span className="space-y-1">
                          <span className="block font-medium">{option.label}</span>
                          <span className="block text-muted-foreground">{option.description}</span>
                        </span>
                      </label>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <div className="font-medium">冲突清单</div>
                    {preview.conflicts.map(conflict => (
                      <div key={`${conflict.row}-${conflict.date}`} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                        第 {conflict.row} 行，{conflict.date}：系统中为 {conflict.existingUserName}，导入值为 {conflict.incomingUserName}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
