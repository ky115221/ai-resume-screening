import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL is not set. Copy backend/.env.example to backend/.env and fill it in.'); process.exit(1); }
const local = /@(localhost|127\.0\.0\.1)/.test(url);
export const pool = new pg.Pool({ connectionString: url, ssl: local ? false : { rejectUnauthorized: false }, max: 5 });
export const q = (text, params) => pool.query(text, params);
export async function migrate() {
  const sql = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'schema.sql'), 'utf8');
  await pool.query(sql);
}
