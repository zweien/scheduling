'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ConfigOptionDialog } from './ConfigOptionDialog';
import { ConfigOptionList } from './ConfigOptionList';
import {
  saveConfigOption,
  deleteConfigOptionAction,
  reorderConfigOptionsAction,
} from '@/app/actions/config-options';
import { toast } from 'sonner';
import type { ConfigOption, ConfigOptionType } from '@/types';

interface ConfigOptionsSectionProps {
  initialOrganizations: ConfigOption[];
  initialCategories: ConfigOption[];
}

export function ConfigOptionsSection({
  initialOrganizations,
  initialCategories,
}: ConfigOptionsSectionProps) {
  const [organizations, setOrganizations] = useState<ConfigOption[]>(initialOrganizations);
  const [categories, setCategories] = useState<ConfigOption[]>(initialCategories);

  // 编辑弹窗状态
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<ConfigOption | null>(null);
  const [editingType, setEditingType] = useState<ConfigOptionType | null>(null);
  const [saving, setSaving] = useState(false);

  // 删除确认弹窗状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingOption, setDeletingOption] = useState<ConfigOption | null>(null);
  const [deleting, startDeleteTransition] = useTransition();

  // 打开新增弹窗
  const handleAdd = (type: ConfigOptionType) => {
    setEditingOption(null);
    setEditingType(type);
    setDialogOpen(true);
  };

  // 打开编辑弹窗
  const handleEdit = (option: ConfigOption) => {
    setEditingOption(option);
    setEditingType(option.type);
    setDialogOpen(true);
  };

  // 保存（新增/编辑）
  const handleSave = async (value: string, label: string) => {
    if (!editingType) return;
    setSaving(true);
    try {
      const saved = await saveConfigOption(
        editingOption?.id ?? null,
        editingType,
        value,
        label
      );
      if (!saved) {
        toast.error('保存失败');
        return;
      }
      if (editingOption) {
        // 编辑模式：更新现有项
        if (editingType === 'organization') {
          setOrganizations((prev) =>
            prev.map((item) => (item.id === saved.id ? saved : item))
          );
        } else {
          setCategories((prev) =>
            prev.map((item) => (item.id === saved.id ? saved : item))
          );
        }
        toast.success('已更新');
      } else {
        // 新增模式：添加到列表
        if (editingType === 'organization') {
          setOrganizations((prev) => [...prev, saved]);
        } else {
          setCategories((prev) => [...prev, saved]);
        }
        toast.success('已添加');
      }
    } finally {
      setSaving(false);
    }
  };

  // 打开删除确认弹窗
  const handleDeleteClick = (option: ConfigOption) => {
    setDeletingOption(option);
    setDeleteDialogOpen(true);
  };

  // 确认删除
  const handleDeleteConfirm = () => {
    if (!deletingOption) return;
    startDeleteTransition(async () => {
      const result = await deleteConfigOptionAction(deletingOption.id);
      if (result.success) {
        if (deletingOption.type === 'organization') {
          setOrganizations((prev) => prev.filter((item) => item.id !== deletingOption.id));
        } else {
          setCategories((prev) => prev.filter((item) => item.id !== deletingOption.id));
        }
        toast.success('已删除');
        setDeleteDialogOpen(false);
        setDeletingOption(null);
      } else {
        toast.error(result.error || '删除失败');
      }
    });
  };

  // 上移
  const handleMoveUp = async (id: number, type: ConfigOptionType) => {
    const list = type === 'organization' ? organizations : categories;
    const index = list.findIndex((item) => item.id === id);
    if (index <= 0) return;

    const newList = [...list];
    [newList[index - 1], newList[index]] = [newList[index], newList[index - 1]];

    // 乐观更新
    if (type === 'organization') {
      setOrganizations(newList);
    } else {
      setCategories(newList);
    }

    // 同步到后端
    await reorderConfigOptionsAction(type, newList.map((item) => item.id));
  };

  // 下移
  const handleMoveDown = async (id: number, type: ConfigOptionType) => {
    const list = type === 'organization' ? organizations : categories;
    const index = list.findIndex((item) => item.id === id);
    if (index < 0 || index >= list.length - 1) return;

    const newList = [...list];
    [newList[index], newList[index + 1]] = [newList[index + 1], newList[index]];

    // 乐观更新
    if (type === 'organization') {
      setOrganizations(newList);
    } else {
      setCategories(newList);
    }

    // 同步到后端
    await reorderConfigOptionsAction(type, newList.map((item) => item.id));
  };

  const typeLabel = editingType === 'organization' ? '所属单位' : '人员类别';

  return (
    <div className="space-y-6">
      {/* 所属单位配置 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">所属单位</h3>
            <p className="text-xs text-muted-foreground">人员所属单位选项</p>
          </div>
          <Button size="sm" onClick={() => handleAdd('organization')}>
            新增
          </Button>
        </div>
        <ConfigOptionList
          options={organizations}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
          onMoveUp={(id) => handleMoveUp(id, 'organization')}
          onMoveDown={(id) => handleMoveDown(id, 'organization')}
        />
      </section>

      {/* 人员类别配置 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">人员类别</h3>
            <p className="text-xs text-muted-foreground">人员分类选项</p>
          </div>
          <Button size="sm" onClick={() => handleAdd('category')}>
            新增
          </Button>
        </div>
        <ConfigOptionList
          options={categories}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
          onMoveUp={(id) => handleMoveUp(id, 'category')}
          onMoveDown={(id) => handleMoveDown(id, 'category')}
        />
      </section>

      {/* 新增/编辑弹窗 */}
      <ConfigOptionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingOption={editingOption}
        typeLabel={typeLabel}
        onSave={handleSave}
        loading={saving}
      />

      {/* 删除确认弹窗 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除「{deletingOption?.label}」吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={deleting}>
              {deleting ? '删除中...' : '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
