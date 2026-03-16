'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  createDutyUser,
  downloadDutyUsersTemplate,
  getDutyUsers,
  getDutyUsersForView,
  importDutyUsersAction,
  previewDutyUsersImportAction,
  removeUser,
  updateDutyUserProfile,
  updateUserActiveAction,
} from '@/app/actions/users';
import type { DutyUserImportPreview, User, UserCategory, UserOrganization } from '@/types';
import { DutyUserFilters } from '@/components/duty-users/DutyUserFilters';
import { DutyUserForm } from '@/components/duty-users/DutyUserForm';
import { DutyUserImportPanel } from '@/components/duty-users/DutyUserImportPanel';
import { DutyUserList } from '@/components/duty-users/DutyUserList';
import type { DutyUserFiltersState, DutyUserFormState } from '@/components/duty-users/types';

const initialFilters: DutyUserFiltersState = {
  search: '',
  organization: '',
  category: '',
  status: '',
};

const initialForm: DutyUserFormState = {
  name: '',
  organization: 'W' as UserOrganization,
  category: 'W' as UserCategory,
  notes: '',
};

interface DutyUserManagementProps {
  canManage: boolean;
}

export function DutyUserManagement({ canManage }: DutyUserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [filters, setFilters] = useState<DutyUserFiltersState>(initialFilters);
  const [form, setForm] = useState<DutyUserFormState>(initialForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<DutyUserImportPreview | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);

  const loadUsers = useCallback(async (nextFilters: DutyUserFiltersState) => {
    const items = canManage
      ? await getDutyUsers(nextFilters)
      : await getDutyUsersForView(nextFilters);
    setUsers(items);
  }, [canManage]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadUsers(filters);
    });
  }, [filters, loadUsers]);

  function updateFilter<K extends keyof DutyUserFiltersState>(key: K, value: DutyUserFiltersState[K]) {
    setFilters(current => ({ ...current, [key]: value }));
  }

  function updateForm<K extends keyof DutyUserFormState>(key: K, value: DutyUserFormState[K]) {
    setForm(current => ({ ...current, [key]: value }));
  }

  function startEdit(user: User) {
    setEditingId(user.id);
    setForm({
      name: user.name,
      organization: user.organization,
      category: user.category,
      notes: user.notes ?? '',
    });
    setError(null);
  }

  function resetForm() {
    setEditingId(null);
    setForm(initialForm);
  }

  async function handleSubmit() {
    setLoading(true);
    setError(null);

    const result = editingId === null
      ? await createDutyUser(form)
      : await updateDutyUserProfile({ id: editingId, ...form });

    setLoading(false);

    if (!result.success) {
      setError(result.error ?? '保存失败');
      return;
    }

    resetForm();
    await loadUsers(filters);
  }

  async function handleDelete(user: User) {
    await removeUser(user.id, user.name);
    await loadUsers(filters);
  }

  async function handleToggleActive(user: User) {
    await updateUserActiveAction(user.id, !user.is_active);
    await loadUsers(filters);
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
    const file = await downloadDutyUsersTemplate();
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
    const result = await previewDutyUsersImportAction(base64);
    setPreview(result);
    setValidating(false);

    if (result.issues.length > 0) {
      setImportError('导入文件存在错误，请先修正');
      return;
    }

    setImportSummary(`共 ${result.totalRows} 行，全部通过校验，可直接导入`);
  }

  async function handleImport() {
    if (!selectedFile) {
      setImportError('请先选择导入文件');
      return;
    }

    setImporting(true);
    setImportError(null);

    const base64 = await fileToBase64(selectedFile);
    const result = await importDutyUsersAction(base64);
    setImporting(false);

    if (!result.success) {
      setPreview(result.preview ?? null);
      setImportError(result.error ?? '导入失败');
      setImportSummary(null);
      return;
    }

    setImportSummary(`导入完成：新增 ${result.createdCount} 人，更新 ${result.updatedCount} 人`);
    setPreview(null);
    setSelectedFile(null);
    await loadUsers(filters);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-4 space-y-1">
          <h2 className="text-xl font-semibold">值班人员管理</h2>
          <p className="text-sm text-muted-foreground">维护值班人员资料、参与状态、所属单位与人员类别。</p>
        </div>
      </section>

      {canManage ? (
        <DutyUserImportPanel
          selectedFile={selectedFile}
          preview={preview}
          importError={importError}
          importSummary={importSummary}
          validating={validating}
          importing={importing}
          onFileChange={file => {
            setSelectedFile(file);
            setPreview(null);
            setImportError(null);
            setImportSummary(null);
          }}
          onDownloadTemplate={() => void handleDownloadTemplate()}
          onPreviewImport={() => void handlePreviewImport()}
          onImport={() => void handleImport()}
        />
      ) : null}

      {canManage ? (
        <DutyUserForm
          form={form}
          editingId={editingId}
          error={error}
          loading={loading}
          onChange={updateForm}
          onCancel={resetForm}
          onSubmit={() => void handleSubmit()}
        />
      ) : null}

      <DutyUserFilters
        filters={filters}
        onFilterChange={updateFilter}
        onReset={() => setFilters(initialFilters)}
      />

      <DutyUserList
        users={users}
        canManage={canManage}
        onEdit={startEdit}
        onToggleActive={user => void handleToggleActive(user)}
        onDelete={user => void handleDelete(user)}
      />
    </div>
  );
}
