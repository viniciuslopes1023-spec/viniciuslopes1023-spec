import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { get, put } from '@vercel/blob';

const DB_PATH = path.join(os.tmpdir(), 'gringa-data', 'gringa.db');
const BLOB_PATH = 'gringa/gringa.db';
const token = process.env.BLOB_READ_WRITE_TOKEN;

let ready = false;

export async function ensureDb(): Promise<void> {
  if (ready) return;
  ready = true;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  if (!token) return;
  try {
    const result = await get(BLOB_PATH, { token, access: 'private' });
    if (!result || result.statusCode !== 200 || !result.stream) return;
    const reader = result.stream.getReader();
    const chunks: Buffer[] = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(Buffer.from(value));
    }
    const body = Buffer.concat(chunks);
    if (body.length > 0) fs.writeFileSync(DB_PATH, body);
  } catch (error) {
    console.error('[gringa] falha ao baixar banco do Blob:', error);
  }
}

export async function persistDb(): Promise<void> {
  if (!token || !fs.existsSync(DB_PATH)) return;
  try {
    await put(BLOB_PATH, fs.readFileSync(DB_PATH), {
      token,
      access: 'private',
      addRandomSuffix: false,
      contentType: 'application/vnd.sqlite3',
    });
  } catch (error) {
    console.error('[gringa] falha ao salvar banco no Blob:', error);
  }
}
