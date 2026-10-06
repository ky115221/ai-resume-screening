// Resume files go to Supabase Storage (private bucket). Never to the server's local disk.
import { createClient } from '@supabase/supabase-js';
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
const BUCKET = process.env.SUPABASE_BUCKET || 'resumes';
const sb = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }) : null;
export const storageEnabled = !!sb;
export async function saveResume(buffer, originalName, contentType) {
  if (!sb) return null; // storage not configured: the extracted text is still saved in the database
  const key = `${Date.now()}-${originalName.replace(/[^\w.-]/g, '_')}`;
  const { error } = await sb.storage.from(BUCKET).upload(key, buffer, { contentType: contentType || 'application/octet-stream' });
  if (error) { console.warn('Supabase Storage upload failed:', error.message); return null; }
  return key;
}
