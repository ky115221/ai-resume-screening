import 'dotenv/config';
import crypto from 'crypto';
import path from 'path';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import mammoth from 'mammoth';
import { extractText, getDocumentProxy } from 'unpdf';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool, q, migrate } from './db.js';
import { parseResume, score, canon, DEFAULT_SETTINGS } from './engine.js';
import { JOBS, CANDIDATES } from './seed.js';
import { saveResume, storageEnabled } from './storage.js';

const SECRET = process.env.JWT_SECRET || (console.warn('JWT_SECRET not set: using a random one (logins reset on restart).'), crypto.randomBytes(32).toString('hex'));
const DEMO_EMAIL = process.env.DEMO_EMAIL || 'hr@demo.com', DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'demo123';

// ---------- row mappers (snake_case DB -> camelCase API) ----------
const jobOut = r => ({ id: r.id, title: r.title, department: r.department, description: r.description, requiredSkills: r.required_skills, preferredSkills: r.preferred_skills, minimumExperience: r.minimum_experience, education: r.education, threshold: r.threshold, createdAt: r.created_at });
const candOut = r => ({
  id: r.id, jobId: r.job_id, jobTitle: r.job_title, name: r.name, email: r.email, phone: r.phone, education: r.education, experience: r.experience,
  skills: r.skills, projects: r.projects, certifications: r.certifications, resumeFile: r.resume_file, resumeStoragePath: r.storage_path, resumeText: r.resume_text, createdAt: r.created_at,
  analysis: r.result || null, hrDecision: r.decision ? { decision: r.decision, comments: r.comments, decidedBy: r.decided_by, decidedAt: r.decided_at } : null,
});
const getSettings = async () => (await q('select value from settings where id=1')).rows[0]?.value || DEFAULT_SETTINGS;

async function insertJob(j) {
  const r = await q('insert into jobs(title,department,description,required_skills,preferred_skills,minimum_experience,education,threshold) values($1,$2,$3,$4,$5,$6,$7,$8) returning id',
    [j.title, j.department || '', j.description || '', JSON.stringify(j.requiredSkills.map(canon)), JSON.stringify((j.preferredSkills || []).map(canon)), +j.minimumExperience || 0, j.education || 'Bachelor', +j.threshold || 80]);
  return r.rows[0].id;
}
async function insertCandidate(jobId, text, file, storagePath) {
  const p = parseResume(text);
  const r = await q('insert into candidates(job_id,name,email,phone,education,experience,skills,projects,certifications,resume_file,storage_path,resume_text) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning id',
    [jobId, p.name, p.email, p.phone, p.education, p.experience, JSON.stringify(p.skills), JSON.stringify(p.projects), JSON.stringify(p.certifications), file, storagePath, text]);
  return r.rows[0].id;
}
async function analyze(id) {
  const c = (await q('select * from candidates where id=$1', [id])).rows[0];
  if (!c) return null;
  const job = jobOut((await q('select * from jobs where id=$1', [c.job_id])).rows[0]);
  const r = score({ skills: c.skills, experience: c.experience, education: c.education || '' }, job, await getSettings());
  await q(`insert into analysis_results(candidate_id,job_id,match_score,recommendation,result) values($1,$2,$3,$4,$5)
    on conflict (candidate_id) do update set job_id=$2, match_score=$3, recommendation=$4, result=$5, created_at=now()`, [id, job.id, r.matchScore, r.recommendation, JSON.stringify(r)]);
  return r;
}
async function seed() {
  await q('truncate table hr_decisions, analysis_results, candidates, jobs restart identity cascade');
  const ids = {};
  for (const j of JOBS) ids[j.title] = await insertJob(j);
  for (const [i, [job, text]] of CANDIDATES.entries()) await analyze(await insertCandidate(ids[job], text, `sample_resume_${i + 1}.txt`, null));
}

// ---------- app ----------
const app = express();
const origins = (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map(s => s.trim().replace(/\/$/, '')).filter(Boolean);
app.use(cors({
  origin: (o, cb) => cb(null, !o || origins.includes(o) || (process.env.ALLOW_VERCEL_PREVIEWS === 'true' && /^https:\/\/[\w-]+\.vercel\.app$/.test(o))),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'], maxAge: 86400,
}));
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024, files: 20 } });
const h = fn => (req, res, next) => fn(req, res, next).catch(next);

app.get('/', (_, res) => res.json({ service: 'AI ResumeScreen API', health: '/health' }));
app.get('/health', h(async (_, res) => { await q('select 1'); res.json({ ok: true, storage: storageEnabled }); }));

app.post('/api/login', h(async (req, res) => {
  const u = (await q('select * from users where email=$1', [String(req.body.email || '').toLowerCase()])).rows[0];
  if (!u || !(await bcrypt.compare(String(req.body.password || ''), u.password_hash))) return res.status(401).json({ error: 'Invalid email or password' });
  res.json({ token: jwt.sign({ sub: u.id, name: u.name }, SECRET, { expiresIn: '12h' }), name: u.name });
}));
app.use('/api', (req, res, next) => {
  try { req.user = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), SECRET).name; next(); }
  catch { res.status(401).json({ error: 'Please log in' }); }
});

app.get('/api/jobs', h(async (_, res) => res.json((await q('select * from jobs order by id')).rows.map(jobOut))));
app.post('/api/jobs', h(async (req, res) => {
  const b = req.body;
  if (!b.title || !b.requiredSkills?.length) return res.status(400).json({ error: 'Title and at least one required skill are needed' });
  res.json({ id: await insertJob(b) });
}));
app.get('/api/settings', h(async (_, res) => res.json(await getSettings())));
app.put('/api/settings', h(async (req, res) => {
  await q('insert into settings(id,value) values(1,$1) on conflict (id) do update set value=$1', [JSON.stringify(req.body)]);
  for (const a of (await q('select candidate_id from analysis_results')).rows) await analyze(a.candidate_id); // re-score with new rules
  res.json(await getSettings());
}));

app.get('/api/candidates', h(async (_, res) => {
  const r = await q(`select c.*, j.title job_title, a.result, d.decision, d.comments, d.decided_by, d.decided_at from candidates c
    join jobs j on j.id=c.job_id left join analysis_results a on a.candidate_id=c.id left join hr_decisions d on d.candidate_id=c.id order by c.id desc`);
  res.json(r.rows.map(candOut));
}));
app.post('/api/upload', upload.array('files'), h(async (req, res) => {
  const jobId = +req.body.jobId, ids = [], errors = [];
  if (!(await q('select 1 from jobs where id=$1', [jobId])).rowCount) return res.status(400).json({ error: 'Select a job role first' });
  for (const f of req.files || []) {
    try {
      const ext = path.extname(f.originalname).toLowerCase();
      const text = ext === '.pdf' ? (await extractText(await getDocumentProxy(new Uint8Array(f.buffer)), { mergePages: true })).text : ext === '.docx' ? (await mammoth.extractRawText({ buffer: f.buffer })).value : ext === '.txt' ? f.buffer.toString('utf8') : null;
      if (text === null) throw new Error('Only PDF, DOCX or TXT files are supported');
      if (text.trim().length < 20) throw new Error('No readable text found (scanned PDF?)');
      const stored = await saveResume(f.buffer, f.originalname, f.mimetype);
      ids.push(await insertCandidate(jobId, text, f.originalname, stored));
    } catch (e) { errors.push(`${f.originalname}: ${e.message}`); }
  }
  res.json({ ids, errors });
}));
app.post('/api/candidates/:id/analyze', h(async (req, res) => {
  const r = await analyze(+req.params.id);
  r ? res.json(r) : res.status(404).json({ error: 'Candidate not found' });
}));
app.post('/api/candidates/:id/decision', h(async (req, res) => {
  const { decision, comments } = req.body;
  if (!['APPROVED', 'REJECTED', 'ON_REVIEW'].includes(decision)) return res.status(400).json({ error: 'Invalid decision' });
  if (!(await q('select 1 from candidates where id=$1', [+req.params.id])).rowCount) return res.status(404).json({ error: 'Candidate not found' });
  await q(`insert into hr_decisions(candidate_id,decision,comments,decided_by) values($1,$2,$3,$4)
    on conflict (candidate_id) do update set decision=$2, comments=$3, decided_by=$4, decided_at=now()`, [+req.params.id, decision, comments || '', req.user]);
  res.json({ ok: true });
}));
app.post('/api/demo/reset', h(async (_, res) => { await seed(); res.json({ ok: true }); }));

app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ error: 'Server error: ' + err.message }); });

// ---------- boot ----------
await migrate();
await q('insert into users(email,password_hash,name) values($1,$2,$3) on conflict (email) do nothing', [DEMO_EMAIL.toLowerCase(), await bcrypt.hash(DEMO_PASSWORD, 10), 'Anita (HR)']);
if (!(await q('select 1 from jobs limit 1')).rowCount) await seed();
const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () => console.log(`API listening on 0.0.0.0:${PORT} (CORS: ${origins.join(', ')}; storage: ${storageEnabled ? 'supabase' : 'off'})`));
