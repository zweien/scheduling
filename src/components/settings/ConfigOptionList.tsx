'use client';

import { Button } from '@/components/ui/button';
import { Pencil, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import type { ConfigOption } from '@/types';

interface ConfigOptionListProps {
  options: ConfigOption[];
  onEdit: (option: ConfigOption) => void;
  onDelete: (option: ConfigOption) => void;
  onMoveUp: (id: number) => void;
  onMoveDown: (id: number) => void;
}

export function ConfigOptionList({
  options,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: ConfigOptionListProps) {
  if (options.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
        暂无配置项，点击上方按钮添加
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {options.map((option, index) => (
        <div
          key={option.id}
          className="flex items-center justify-between gap-2 rounded-lg border bg-muted/20 px-3 py-2"
        >
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{option.label}</div>
            <div className="text-xs text-muted-foreground truncate">
              值: {option.value}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onMoveUp(option.id)}
              disabled={index === 0}
              title="上移"
            >
              <ChevronUp className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onMoveDown(option.id)}
              disabled={index === options.length - 1}
              title="下移"
            >
              <ChevronDown className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onEdit(option)}
              title="编辑"
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onDelete(option)}
              title="删除"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
