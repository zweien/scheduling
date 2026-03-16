'use server';

import { createOrUpdateUserByName } from '@/lib/users';
import { requireAdmin } from '@/lib/auth';
import { addWebLog } from '@/lib/logs';
import { revalidatePath } from 'next/cache';
import { buildDutyUsersTemplateWorkbook } from '@/lib/imports/duty-users-template';
import { previewDutyUsersImport } from '@/lib/imports/duty-users-import';
import type { DutyUserImportPreview } from '@/types';

type BinaryExportResponse = {
  fileName: string;
  mimeType: string;
  content: string;
};

function decodeBase64File(fileBase64: string) {
  const content = fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64;
  return Buffer.from(content, 'base64');
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
