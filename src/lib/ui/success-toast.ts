const SUCCESS_TOAST_STORAGE_KEY = 'pending-success-toast';

export function getDeleteDutyUsersSuccessMessage(count: number) {
  return `已删除 ${count} 名值班人员`;
}

export function getDeleteSchedulesSuccessMessage(count: number) {
  return `已删除 ${count} 条排班`;
}

export function getDutyUsersImportSuccessMessage(createdCount: number, updatedCount: number) {
  return `导入完成：新增 ${createdCount} 人，更新 ${updatedCount} 人`;
}

export function getScheduleImportSuccessMessage(
  importedCount: number,
  skippedCount: number,
  overwrittenCount: number,
  conflictCount: number
) {
  return `导入完成：成功 ${importedCount} 条，跳过 ${skippedCount} 条，覆盖 ${overwrittenCount} 条，冲突 ${conflictCount} 条`;
}

export function queueSuccessToast(message: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(SUCCESS_TOAST_STORAGE_KEY, message);
}

export function clearQueuedSuccessToast() {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.removeItem(SUCCESS_TOAST_STORAGE_KEY);
}

export function consumeSuccessToast() {
  if (typeof window === 'undefined') {
    return null;
  }

  const message = window.sessionStorage.getItem(SUCCESS_TOAST_STORAGE_KEY);
  if (!message) {
    return null;
  }

  window.sessionStorage.removeItem(SUCCESS_TOAST_STORAGE_KEY);
  return message;
}
