import { query } from '../../util/mysql';
import { IUploadedFile } from '@src/routes/modules/upload/types';

/** 获取自增 id */
async function nextId(): Promise<number> {
  const rows = await query('SELECT MAX(id) as maxId FROM uploads') as { maxId: number }[];
  return (rows[0]?.maxId || 0) + 1;
}

/** 保存上传文件记录 */
async function add(record: Omit<IUploadedFile, 'id'>): Promise<IUploadedFile> {
  const id = await nextId();
  const sql = `
    INSERT INTO uploads (id, originalName, storedName, filePath, fileSize, mimeType, userId, uploadTime)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  await query(sql, [
    id,
    record.originalName,
    record.storedName,
    record.filePath,
    record.fileSize,
    record.mimeType,
    record.userId,
    record.uploadTime || new Date().toLocaleString(),
  ]);

  const result = await getById(id);

  if (!result) {
    throw new Error(`Insert succeeded but record not found, id=${id}`);
  }
  // 返回插入的记录
  return result;
}

/** 通过 id 获取上传记录 */
async function getById(id: number): Promise<IUploadedFile | null> {
  const sql = 'SELECT * FROM uploads WHERE id = ?';
  const rows = await query(sql, [id]) as IUploadedFile[];
  return rows.length > 0 ? rows[0] : null;
}

/** 获取用户的所有上传记录 */
async function getAllByUserId(userId: number): Promise<IUploadedFile[]> {
  const sql = 'SELECT * FROM uploads WHERE userId = ? ORDER BY uploadTime DESC';
  return await query(sql, [userId]) as IUploadedFile[];
}

/** 删除上传记录 */
async function deleteById(id: number): Promise<boolean> {
  const sql = 'DELETE FROM uploads WHERE id = ?';
  const result = await query(sql, [id]) as { affectedRows: number };
  return (result.affectedRows || 0) > 0;
}

export default {
  add,
  getById,
  getAllByUserId,
  deleteById,
} as const;
