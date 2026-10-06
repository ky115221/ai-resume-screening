// End-to-end test: real PostgreSQL (embedded, throwaway) + the real API process. Run: npm run test:e2e
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';
import { spawn } from 'child_process';
import fs from 'fs';

const DB = 'postgresql://postgres:pw@localhost:54329/resume', API = 'http://localhost:4100';
let fails = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) fails++; };

const pgdb = new EmbeddedPostgres({ databaseDir: '/tmp/e2e-pg-' + Date.now(), user: 'postgres', password: 'pw', port: 54329, persistent: false, createPostgresUser: process.getuid?.() === 0 });
let srv;
try {
  await pgdb.initialise(); await pgdb.start(); await pgdb.createDatabase('resume');
  srv = spawn('node', ['index.js'], { env: { ...process.env, DATABASE_URL: DB, PORT: '4100', JWT_SECRET: 'test-secret', CORS_ORIGINS: 'http://localhost:5173' }, stdio: 'inherit' });
  for (let i = 0; i < 60; i++) { try { if ((await fetch(API + '/health')).ok) break; } catch {} await new Promise(r => setTimeout(r, 500)); }
  const j = async (path, opts = {}, token) => { const r = await fetch(API + path, { ...opts, headers: { ...(opts.body && !(opts.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: opts.body instanceof FormData ? opts.body : opts.body && JSON.stringify(opts.body) }); return { s: r.status, d: await r.json() }; };

  ok((await fetch(API + '/health')).ok, 'health endpoint responds');
  const cors = await fetch(API + '/health', { headers: { Origin: 'http://localhost:5173' } }), bad = await fetch(API + '/health', { headers: { Origin: 'https://evil.example' } });
  ok(cors.headers.get('access-control-allow-origin') === 'http://localhost:5173' && !bad.headers.get('access-control-allow-origin'), 'CORS allows the configured origin only');
  ok((await j('/api/jobs')).s === 401, 'API rejects requests without a token');
  ok((await j('/api/login', { method: 'POST', body: { email: 'hr@demo.com', password: 'nope' } })).s === 401, 'wrong password rejected');
  const { d: { token } } = await j('/api/login', { method: 'POST', body: { email: 'hr@demo.com', password: 'demo123' } });
  ok(!!token, 'LOGIN works (hr@demo.com / demo123)');

  const stats = async () => { const c = (await j('/api/candidates', {}, token)).d, eff = x => x.hrDecision ? { APPROVED: 'APPROVE', REJECTED: 'REJECT', ON_REVIEW: 'REVIEW' }[x.hrDecision.decision] : x.analysis?.recommendation; return { total: c.length, A: c.filter(x => eff(x) === 'APPROVE').length, R: c.filter(x => eff(x) === 'REVIEW').length, X: c.filter(x => eff(x) === 'REJECT').length, c }; };
  const s0 = await stats();
  ok(s0.total === 7, `DASHBOARD seed data: ${s0.total} candidates (approve ${s0.A}, review ${s0.R}, reject ${s0.X})`);
  const scores = Object.fromEntries(s0.c.filter(x => x.jobTitle === 'AI Engineer').map(x => [x.name, x.analysis.matchScore]));
  ok(scores['Aarav Mehta'] >= 80 && scores['Priya Nair'] >= 60 && scores['Priya Nair'] < 80 && scores['Kunal Verma'] < 40, `5 AI Engineer samples score differently ${JSON.stringify(scores)}`);

  const job = await j('/api/jobs', { method: 'POST', body: { title: 'AI Engineer (E2E)', department: 'Engineering', minimumExperience: 2, education: 'Bachelor', threshold: 80, requiredSkills: ['Python', 'Machine Learning', 'Deep Learning', 'NLP', 'TensorFlow', 'PyTorch', 'Pandas', 'NumPy', 'Scikit-learn', 'SQL'], preferredSkills: ['Generative AI', 'LLMs', 'Computer Vision', 'Hugging Face', 'LangChain', 'AWS'] } }, token);
  ok(job.s === 200 && job.d.id, 'CREATE AI Engineer job');

  const fd = new FormData(); fd.append('jobId', job.d.id);
  fd.append('files', new Blob([fs.readFileSync('../sample-resumes/strong_ai_engineer_maya_rao.pdf')], { type: 'application/pdf' }), 'maya_rao.pdf');
  fd.append('files', new Blob([fs.readFileSync('../sample-resumes/average_ai_candidate_nikhil_jain.docx')]), 'nikhil.docx');
  fd.append('files', new Blob(['Wes Dev\nEducation\nB.Com\nSkills\nHTML, CSS, JavaScript, React, WordPress\nExperience\n3 years\n'], { type: 'text/plain' }), 'wes.txt');
  const up = await j('/api/upload', { method: 'POST', body: fd }, token);
  ok(up.d.ids?.length === 3 && !up.d.errors.length, `UPLOAD PDF + DOCX + TXT resumes ${JSON.stringify(up.d)}`);
  const [maya, nikhil, wes] = up.d.ids;
  const a = (await j(`/api/candidates/${maya}/analyze`, { method: 'POST' }, token)).d;
  ok(a.matchScore >= 80 && a.recommendation === 'APPROVE', `ANALYZE strong PDF resume: ${a.matchScore}% ${a.recommendation}`);
  ok(a.matchedSkills.includes('Python') && a.matchedSkills.includes('NLP') && Array.isArray(a.missingSkills), `matched ${a.matchedSkills.length} skills, missing [${a.missingSkills}]`);
  const w = (await j(`/api/candidates/${wes}/analyze`, { method: 'POST' }, token)).d;
  const n = (await j(`/api/candidates/${nikhil}/analyze`, { method: 'POST' }, token)).d;
  ok(n.recommendation === 'REVIEW', `DOCX resume parsed: ${n.matchScore}% ${n.recommendation}`);
  ok(w.matchScore < 40 && w.recommendation === 'REJECT' && w.missingSkills.length >= 8, `web developer: ${w.matchScore}% ${w.recommendation}, missing ${w.missingSkills.length}`);

  const before = await stats();
  const dec = await j(`/api/candidates/${maya}/decision`, { method: 'POST', body: { decision: 'REJECTED', comments: 'e2e override' } }, token);
  const after = await stats(), m = after.c.find(x => x.id === maya);
  ok(dec.s === 200 && m.hrDecision.decision === 'REJECTED' && m.analysis.recommendation === 'APPROVE', 'HR REJECT saved; AI recommendation unchanged (stored separately)');
  ok(after.A === before.A - 1 && after.X === before.X + 1, `DASHBOARD stats updated (approve ${before.A}->${after.A}, reject ${before.X}->${after.X})`);
  const db = new pg.Client({ connectionString: DB }); await db.connect();
  const row = (await db.query('select decision, comments, decided_by from hr_decisions where candidate_id=$1', [maya])).rows[0];
  ok(row?.decision === 'REJECTED' && row.decided_by, `DATABASE row verified in hr_decisions: ${JSON.stringify(row)}`);
  await db.end();
  ok((await j('/api/demo/reset', { method: 'POST' }, token)).s === 200 && (await stats()).total === 7, 'demo reset restores seed data');
} catch (e) { console.error(e); fails++; }
finally { srv?.kill(); await pgdb.stop().catch(() => {}); }
console.log(fails ? `\n${fails} FAILED` : '\nALL CHECKS PASSED'); process.exit(fails ? 1 : 0);
