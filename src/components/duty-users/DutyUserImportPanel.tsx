'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { DutyUserImportPreview } from '@/types';

interface DutyUserImportPanelProps {
  selectedFile: File | null;
  preview: DutyUserImportPreview | null;
  importError: string | null;
  importSummary: string | null;
  validating: boolean;
  importing: boolean;
  onFileChange: (file: File | null) => void;
  onDownloadTemplate: () => void;
  onPreviewImport: () => void;
  onImport: () => void;
}

export function DutyUserImportPanel({
  selectedFile,
  preview,
  importError,
  importSummary,
  validating,
  importing,
  onFileChange,
  onDownloadTemplate,
  onPreviewImport,
  onImport,
}: DutyUserImportPanelProps) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-4 space-y-1">
        <p className="text-sm text-muted-foreground">下载模板后填写值班人员信息，上传前会检查必填字段和枚举值。</p>
        <h3 className="text-lg font-semibold">批量导入</h3>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[auto_1fr_auto_auto] lg:items-end">
        <div>
          <Button variant="outline" onClick={onDownloadTemplate}>
            下载模板
          </Button>
        </div>
        <div className="space-y-2">
          <Label htmlFor="duty-user-import-file">导入文件</Label>
          <Input
            id="duty-user-import-file"
            type="file"
            accept=".xlsx"
            onChange={event => {
              onFileChange(event.target.files?.[0] ?? null);
            }}
          />
        </div>
        <Button variant="outline" onClick={onPreviewImport} disabled={validating}>
          {validating ? '校验中...' : '校验文件'}
        </Button>
        <Button onClick={onImport} disabled={importing || !preview || preview.issues.length > 0}>
          {importing ? '导入中...' : '开始导入'}
        </Button>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        {selectedFile ? <div className="text-muted-foreground">已选择文件：{selectedFile.name}</div> : null}
        {importError ? <div className="text-destructive">{importError}</div> : null}
        {importSummary ? <div className="text-emerald-700">{importSummary}</div> : null}
      </div>

      {preview ? (
        <div className="mt-4 space-y-3 rounded-xl border border-border bg-muted/30 p-4">
          <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
            <div>总行数：{preview.totalRows}</div>
            <div>可导入：{preview.validRows}</div>
            <div>错误数：{preview.issues.length}</div>
          </div>

          {preview.issues.length > 0 ? (
            <div className="space-y-2">
              <div className="font-medium text-destructive">校验错误</div>
              <div className="space-y-2">
                {preview.issues.map(issue => (
                  <div key={`${issue.row}-${issue.field}-${issue.message}`} className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    第 {issue.row} 行，{issue.field}：{issue.message}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-sm text-emerald-700">文件校验通过，可以开始导入</div>
          )}
        </div>
      ) : null}
    </section>
  );
}
