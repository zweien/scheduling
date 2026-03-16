// src/app/actions/users.ts
'use server';

import { createOrUpdateUserByName, getActiveUsers, getAllUsers, createUser, deleteUser, getUserById, getUsersByFilters, reorderUsers, setUserActive, updateUserProfile } from '@/lib/users';
import { requireAdmin } from '@/lib/auth';
import { addWebLog } from '@/lib/logs';
import { revalidatePath } from 'next/cache';
import { buildDutyUsersTemplateWorkbook } from '@/lib/imports/duty-users-template';
import { previewDutyUsersImport } from '@/lib/imports/duty-users-import';
import type { DutyUserImportPreview, UserCategory, UserOrganization } from '@/types';

type BinaryExportResponse = {
  fileName: string;
  mimeType: string;
  content: string;
};

function decodeBase64File(fileBase64: string) {
  const content = fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64;
  return Buffer.from(content, 'base64');
}

export async function getUsers() {
  return getAllUsers();
}

export async function getAssignableUsers() {
  return getActiveUsers();
}

export async function getDutyUsers(filters?: {
  search?: string;
  organization?: UserOrganization | '';
  category?: UserCategory | '';
  status?: 'active' | 'inactive' | '';
}) {
  await requireAdmin();
  return getUsersByFilters(filters);
}

export async function addUser(name: string) {
  const account = await requireAdmin();
  const user = createUser(name);
  await addWebLog('add_user', `人员: ${name}`, undefined, undefined, {
    username: account.username,
    role: account.role,
  });
  revalidatePath('/dashboard');
  return user;
}

export async function createDutyUser(input: {
  name: string;
  organization: UserOrganization;
  category: UserCategory;
  notes: string;
}) {
  const account = await requireAdmin();

  if (!input.name.trim()) {
    return { success: false, error: '姓名不能为空' };
  }

  const user = createUser(input.name.trim(), {
    organization: input.organization,
    category: input.category,
    notes: input.notes,
  });

  await addWebLog('add_user', `人员: ${user.name}`, undefined, `${user.organization}/${user.category}`, {
    username: account.username,
    role: account.role,
  });

  revalidatePath('/dashboard/users');
  return { success: true, user };
}

export async function removeUser(id: number, name: string) {
  const account = await requireAdmin();
  deleteUser(id);
  await addWebLog('delete_user', `人员: ${name}`, undefined, undefined, {
    username: account.username,
    role: account.role,
  });
  revalidatePath('/dashboard');
}

export async function updateUserOrder(userIds: number[]) {
  const account = await requireAdmin();
  reorderUsers(userIds);
  await addWebLog('reorder_users', '人员排序', undefined, undefined, {
    username: account.username,
    role: account.role,
  });
  revalidatePath('/dashboard');
}

export async function updateUserActiveAction(id: number, isActive: boolean) {
  const account = await requireAdmin();
  const user = getUserById(id);
  if (!user) return;

  setUserActive(id, isActive);
  // isActive 是新状态：true=参与，false=不参与
  await addWebLog('toggle_user_active', `人员: ${user.name}`, isActive ? '不参与' : '参与', isActive ? '参与' : '不参与', {
    username: account.username,
    role: account.role,
  });
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/users');
}

export async function updateDutyUserProfile(input: {
  id: number;
  name: string;
  organization: UserOrganization;
  category: UserCategory;
  notes: string;
}) {
  const account = await requireAdmin();
  const current = getUserById(input.id);

  if (!current) {
    return { success: false, error: '人员不存在' };
  }

  if (!input.name.trim()) {
    return { success: false, error: '姓名不能为空' };
  }

  const updated = updateUserProfile(input.id, {
    name: input.name.trim(),
    organization: input.organization,
    category: input.category,
    notes: input.notes,
  });

  await addWebLog(
    'update_user_profile',
    `人员: ${current.name}`,
    `${current.organization}/${current.category}/${current.notes ?? ''}`,
    `${updated?.organization}/${updated?.category}/${updated?.notes ?? ''}`,
    { username: account.username, role: account.role }
  );

  revalidatePath('/dashboard/users');
  return { success: true, user: updated };
}

export async function downloadDutyUsersTemplate(): Promise<BinaryExportResponse> {
  await requireAdmin();
  const workbook = await buildDutyUsersTemplateWorkbook();

  return {
    fileName: '值班人员导入模板.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    content: workbook.toString('base64'),
  };
}

export async function previewDutyUsersImportAction(fileBase64: string): Promise<DutyUserImportPreview> {
  await requireAdmin();
  const fileBuffer = decodeBase64File(fileBase64);
  return previewDutyUsersImport(fileBuffer);
}

export async function importDutyUsersAction(fileBase64: string) {
  const account = await requireAdmin();
  const fileBuffer = decodeBase64File(fileBase64);
  const preview = await previewDutyUsersImport(fileBuffer);

  if (preview.issues.length > 0) {
    return {
      success: false,
      error: '导入文件校验失败，请先修正后再导入',
      preview,
    };
  }

  let createdCount = 0;
  let updatedCount = 0;

  for (const row of preview.rows) {
    const result = createOrUpdateUserByName(row);
    if (result.type === 'created') {
      createdCount += 1;
    } else {
      updatedCount += 1;
    }
  }

  await addWebLog(
    'import_users',
    '值班人员批量导入',
    undefined,
    `新增 ${createdCount} 条，更新 ${updatedCount} 条`,
    { username: account.username, role: account.role }
  );

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/users');

  return {
    success: true,
    createdCount,
    updatedCount,
  };
}
