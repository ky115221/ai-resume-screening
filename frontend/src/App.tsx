import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { LayoutDashboard, Briefcase, Upload, Users, BarChart3, ShieldCheck, PlayCircle, LogOut, Menu, Check, X, AlertTriangle, RotateCcw, Plus, Search, FileText, Sparkles } from 'lucide-react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const PINE = '#123c3a'
const C = { APPROVE: '#1f9d62', REVIEW: '#d9902f', REJECT: '#d1453b' } as any
const NOTE = 'AI provides a recommendation based on job requirements. Final hiring decisions remain with the HR/recruiter.'

const API = ((import.meta as any).env.VITE_API_URL || '').replace(/\/$/, '')
async function api(path: string, opts: any = {}) {
  const isForm = opts.body instanceof FormData
  const res = await fetch(API + '/api' + path, {
    ...opts, body: isForm ? opts.body : opts.body && JSON.stringify(opts.body),
    headers: { ...(isForm ? {} : { 'Content-Type': 'application/json' }), Authorization: 'Bearer ' + localStorage.getItem('token') },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) { const e: any = new Error(data.error || 'Request failed'); e.status = res.status; throw e }
  return data
}
const Ctx = createContext<any>(null)
const useApp = () => useContext(Ctx)
const outcome = (c: any) => c.hrDecision ? ({ APPROVED: 'APPROVE', REJECTED: 'REJECT', ON_REVIEW: 'REVIEW' } as any)[c.hrDecision.decision] : c.analysis?.recommendation
const hrLabel = (c: any) => c.hrDecision ? ({ APPROVED: 'Approved', REJECTED: 'Rejected', ON_REVIEW: 'On review' } as any)[c.hrDecision.decision] : c.analysis ? 'Pending' : 'Not analyzed'

const Card = ({ children, className = '' }: any) => <div className={`bg-white rounded-xl border border-[#dde4df] p-5 ${className}`}>{children}</div>
const Badge = ({ kind, children }: any) => <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-bold text-white" style={{ background: C[kind] || '#7b8a86' }}>{children ?? kind}</span>
const Bar1 = ({ pct, color = PINE }: any) => <div className="h-2 rounded-full bg-[#e6ece8] overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} /></div>
const Btn = ({ children, onClick, kind = 'primary', className = '', ...r }: any) => <button onClick={onClick} {...r} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${kind === 'primary' ? 'text-white hover:brightness-125' : 'border border-[#c9d3cd] bg-white hover:bg-[#eef2ef]'} ${className}`} style={kind === 'primary' ? { background: PINE } : {}}>{children}</button>
const Title = ({ children, sub }: any) => <div className="mb-5"><h1 className="text-2xl font-extrabold tracking-tight">{children}</h1>{sub && <p className="text-sm text-[#5d706b] mt-1">{sub}</p>}</div>
const Stat = ({ label, value, color }: any) => <Card><div className="text-sm text-[#5d706b]">{label}</div><div className="text-3xl font-extrabold mt-1" style={{ color }}>{value}</div></Card>
const Input = (p: any) => <input {...p} className="w-full rounded-lg border border-[#c9d3cd] px-3 py-2 text-sm bg-white focus:outline-2 focus:outline-[#2f7d6d]" />

function Login({ onLogin }: any) {
  const [email, setEmail] = useState('hr@demo.com'), [password, setPassword] = useState('demo123'), [err, setErr] = useState('')
  const go = async () => { setErr(''); try { const r = await api('/login', { method: 'POST', body: { email, password } }); localStorage.setItem('token', r.token); localStorage.setItem('user', r.name); onLogin() } catch (e: any) { setErr(e.message) } }
  return <div className="min-h-screen grid md:grid-cols-2">
    <div className="hidden md:flex flex-col justify-end p-12 text-white" style={{ background: PINE }}>
      <Sparkles className="mb-6" size={36} /><div className="text-4xl font-extrabold leading-tight">Hire Smarter.<br />Faster. Fairer.</div>
      <p className="mt-4 text-white/70 max-w-sm">Score every resume against the skills a role really needs, see why, and keep the final call with your recruiters.</p>
    </div>
    <div className="flex items-center justify-center p-6"><div className="w-full max-w-sm">
      <div className="text-xl font-extrabold mb-1">AI ResumeScreen</div><p className="text-sm text-[#5d706b] mb-6">Sign in to the recruiter dashboard</p>
      <label className="text-sm font-semibold">Email</label><Input value={email} onChange={(e: any) => setEmail(e.target.value)} />
      <label className="text-sm font-semibold mt-3 block">Password</label><Input type="password" value={password} onChange={(e: any) => setPassword(e.target.value)} onKeyDown={(e: any) => e.key === 'Enter' && go()} />
      {err && <p className="text-sm text-red-600 mt-2">{err}</p>}
      <Btn onClick={go} className="w-full justify-center mt-5">Log in</Btn>
      <p className="text-xs text-[#5d706b] mt-4">Demo login: hr@demo.com / demo123</p>
    </div></div></div>
}

const NAV = [['dashboard', 'Dashboard', LayoutDashboard], ['jobs', 'Jobs', Briefcase], ['upload', 'Upload resumes', Upload], ['candidates', 'Candidates', Users], ['analytics', 'Analytics', BarChart3], ['fairness', 'Fairness & settings', ShieldCheck]] as any

function Dashboard() {
  const { cands, jobs, go } = useApp()
  const n = (k: string) => cands.filter((c: any) => outcome(c) === k).length
  const scored = cands.filter((c: any) => c.analysis), avg = scored.length ? Math.round(scored.reduce((s: number, c: any) => s + c.analysis.matchScore, 0) / scored.length) : 0
  const pie = ['APPROVE', 'REVIEW', 'REJECT'].map(k => ({ name: k, value: n(k) }))
  const dist = ['0-19', '20-39', '40-59', '60-79', '80-100'].map((l, i) => ({ range: l, count: scored.filter((c: any) => Math.min(4, Math.floor(c.analysis.matchScore / 20)) === i).length }))
  const byJob = jobs.map((j: any) => ({ job: j.title, count: cands.filter((c: any) => c.jobId === j.id).length }))
  return <>
    <Title sub={NOTE}>Dashboard</Title>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Stat label="Total resumes" value={cands.length} /><Stat label="Approved" value={n('APPROVE')} color={C.APPROVE} />
      <Stat label="Under review" value={n('REVIEW')} color={C.REVIEW} /><Stat label="Rejected" value={n('REJECT')} color={C.REJECT} />
      <Stat label="Average match score" value={avg + '%'} /><Stat label="Jobs created" value={jobs.length} />
    </div>
    <div className="grid lg:grid-cols-3 gap-4 mt-4">
      <Card><h3 className="font-bold mb-2">Approved vs review vs rejected</h3><ResponsiveContainer height={220}><PieChart><Pie data={pie} dataKey="value" innerRadius={50} outerRadius={80}>{pie.map(p => <Cell key={p.name} fill={C[p.name]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></Card>
      <Card><h3 className="font-bold mb-2">Match score distribution</h3><ResponsiveContainer height={220}><BarChart data={dist}><CartesianGrid vertical={false} stroke="#e6ece8" /><XAxis dataKey="range" fontSize={12} /><YAxis allowDecimals={false} fontSize={12} /><Tooltip /><Bar dataKey="count" fill={PINE} radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></Card>
      <Card><h3 className="font-bold mb-2">Applications by job role</h3><ResponsiveContainer height={220}><BarChart data={byJob} layout="vertical"><XAxis type="number" allowDecimals={false} fontSize={12} /><YAxis type="category" dataKey="job" width={100} fontSize={11} /><Tooltip /><Bar dataKey="count" fill="#2f7d6d" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></Card>
    </div>
    <Card className="mt-4"><h3 className="font-bold mb-3">Recent applications</h3>
      {cands.slice(0, 5).map((c: any) => <button key={c.id} onClick={() => go('candidate', c.id)} className="flex w-full items-center justify-between py-2 border-t border-[#eef2ef] first:border-0 text-left">
        <div><div className="font-semibold">{c.name}</div><div className="text-xs text-[#5d706b]">{c.jobTitle} · {new Date(c.createdAt).toLocaleDateString()}</div></div>
        <div className="flex items-center gap-3"><span className="font-bold">{c.analysis ? c.analysis.matchScore + '%' : '—'}</span>{outcome(c) && <Badge kind={outcome(c)} />}</div></button>)}
    </Card></>
}

function Jobs() {
  const { jobs, cands, go } = useApp()
  return <><div className="flex justify-between items-start"><Title sub="Roles you are hiring for">Jobs</Title><Btn onClick={() => go('newjob')}><Plus size={16} />New job</Btn></div>
    <div className="grid md:grid-cols-2 gap-4">{jobs.map((j: any) => {
      const cs = cands.filter((c: any) => c.jobId === j.id), k = (o: string) => cs.filter((c: any) => outcome(c) === o).length, sc = cs.filter((c: any) => c.analysis)
      return <Card key={j.id}><div className="flex justify-between"><div><div className="font-extrabold text-lg">{j.title}</div><div className="text-xs text-[#5d706b]">{j.department} · min {j.minimumExperience} yrs · approve ≥ {j.threshold}%</div></div></div>
        <div className="text-xs text-[#5d706b] mt-3 line-clamp-2">Required: {j.requiredSkills.join(', ')}</div>
        <div className="grid grid-cols-5 gap-2 mt-4 text-center text-sm">{[['Applications', cs.length], ['Approved', k('APPROVE')], ['Review', k('REVIEW')], ['Rejected', k('REJECT')], ['Avg score', (sc.length ? Math.round(sc.reduce((s: number, c: any) => s + c.analysis.matchScore, 0) / sc.length) : 0) + '%']].map(([l, v]) => <div key={l as string}><div className="font-extrabold">{v}</div><div className="text-[11px] text-[#5d706b]">{l}</div></div>)}</div></Card>
    })}</div></>
}

function NewJob() {
  const { refresh, toast, go } = useApp()
  const [f, setF] = useState<any>({ title: '', department: '', description: '', required: '', preferred: '', minimumExperience: 2, education: 'Bachelor', threshold: 80 })
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value })
  const list = (s: string) => s.split(/[,\n]/).map(x => x.trim()).filter(Boolean)
  const save = async () => { try { await api('/jobs', { method: 'POST', body: { ...f, requiredSkills: list(f.required), preferredSkills: list(f.preferred) } }); await refresh(); toast('Job saved'); go('jobs') } catch (e: any) { toast(e.message, true) } }
  return <><Title sub="Skills accept synonyms, e.g. ML = Machine Learning, sklearn = Scikit-learn">Create job</Title>
    <Card className="max-w-3xl grid md:grid-cols-2 gap-4">
      <div><label className="text-sm font-semibold">Job title</label><Input value={f.title} onChange={set('title')} placeholder="AI Engineer" /></div>
      <div><label className="text-sm font-semibold">Department</label><Input value={f.department} onChange={set('department')} /></div>
      <div className="md:col-span-2"><label className="text-sm font-semibold">Job description</label><textarea className="w-full rounded-lg border border-[#c9d3cd] px-3 py-2 text-sm" rows={3} value={f.description} onChange={set('description')} /></div>
      <div><label className="text-sm font-semibold">Required skills (comma or line separated)</label><textarea className="w-full rounded-lg border border-[#c9d3cd] px-3 py-2 text-sm" rows={4} value={f.required} onChange={set('required')} /></div>
      <div><label className="text-sm font-semibold">Preferred skills</label><textarea className="w-full rounded-lg border border-[#c9d3cd] px-3 py-2 text-sm" rows={4} value={f.preferred} onChange={set('preferred')} /></div>
      <div><label className="text-sm font-semibold">Minimum experience (years)</label><Input type="number" value={f.minimumExperience} onChange={set('minimumExperience')} /></div>
      <div><label className="text-sm font-semibold">Education</label><Input value={f.education} onChange={set('education')} /></div>
      <div><label className="text-sm font-semibold">Approve threshold (%)</label><Input type="number" value={f.threshold} onChange={set('threshold')} /></div>
      <div className="md:col-span-2"><Btn onClick={save}>Save job</Btn></div></Card></>
}

function UploadPage() {
  const { jobs, cands, refresh, toast, go } = useApp()
  const [jobId, setJobId] = useState(jobs[0]?.id || ''), [busy, setBusy] = useState(false), [over, setOver] = useState(false), [fresh, setFresh] = useState<number[]>([])
  const send = async (files: FileList | File[]) => {
    const fd = new FormData(); fd.append('jobId', String(jobId)); Array.from(files).forEach(f => fd.append('files', f)); setBusy(true)
    try { const r = await api('/upload', { method: 'POST', body: fd }); await refresh(); setFresh(r.ids); r.errors.forEach((e: string) => toast(e, true)); if (r.ids.length) toast(`${r.ids.length} resume(s) uploaded`) } catch (e: any) { toast(e.message, true) }
    setBusy(false)
  }
  const analyze = async (id: number) => { await api(`/candidates/${id}/analyze`, { method: 'POST' }); await refresh(); toast('Analysis complete'); go('candidate', id) }
  const rows = cands.filter((c: any) => fresh.includes(c.id) || !c.analysis)
  return <><Title sub="PDF, DOCX or TXT. Upload several at once.">Upload resumes</Title>
    <Card className="max-w-3xl">
      <label className="text-sm font-semibold">Job role</label>
      <select value={jobId} onChange={e => setJobId(e.target.value)} className="w-full rounded-lg border border-[#c9d3cd] px-3 py-2 text-sm mb-4 bg-white">{jobs.map((j: any) => <option key={j.id} value={j.id}>{j.title}</option>)}</select>
      <label onDragOver={e => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={e => { e.preventDefault(); setOver(false); send(e.dataTransfer.files) }}
        className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 cursor-pointer text-center ${over ? 'bg-[#e4efe9] border-[#2f7d6d]' : 'border-[#c9d3cd]'}`}>
        <Upload size={28} /><div className="font-semibold mt-2">{busy ? 'Reading resumes…' : 'Drag and drop resumes here, or click to browse'}</div>
        <input type="file" multiple accept=".pdf,.docx,.txt" className="hidden" onChange={e => e.target.files && send(e.target.files)} /></label></Card>
    <Card className="mt-4 overflow-x-auto"><h3 className="font-bold mb-3">Awaiting analysis</h3>
      {!rows.length && <p className="text-sm text-[#5d706b]">No new resumes. Upload one above to get started.</p>}
      <table className="w-full text-sm"><tbody>{rows.map((c: any) => <tr key={c.id} className="border-t border-[#eef2ef]"><td className="py-2 font-semibold">{c.name}</td><td>{c.resumeFile}</td><td>{new Date(c.createdAt).toLocaleDateString()}</td><td>{c.jobTitle}</td><td><Badge>{hrLabel(c)}</Badge></td><td className="text-right"><Btn onClick={() => analyze(c.id)}><Sparkles size={14} />Analyze</Btn></td></tr>)}</tbody></table></Card></>
}

function Candidates() {
  const { cands, jobs, go } = useApp()
  const [q, setQ] = useState(''), [job, setJob] = useState(''), [out, setOut] = useState(''), [min, setMin] = useState(0), [exp, setExp] = useState('')
  const rows = useMemo(() => cands.filter((c: any) => (!q || (c.name + c.skills.join(' ')).toLowerCase().includes(q.toLowerCase())) && (!job || c.jobId == job) && (!out || c.analysis?.recommendation === out) && (!min || (c.analysis?.matchScore ?? 0) >= min) &&
    (!exp || (exp === '0' ? c.experience < 1 : exp === '1' ? c.experience >= 1 && c.experience < 3 : c.experience >= 3))), [cands, q, job, out, min, exp])
  const sel = 'rounded-lg border border-[#c9d3cd] px-3 py-2 text-sm bg-white'
  return <><Title sub="Click a candidate to see the full analysis">Candidates</Title>
    <div className="flex flex-wrap gap-2 mb-4"><div className="relative"><Search size={14} className="absolute left-3 top-3 text-[#7b8a86]" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name or skill" className={sel + ' pl-8'} /></div>
      <select className={sel} value={job} onChange={e => setJob(e.target.value)}><option value="">All roles</option>{jobs.map((j: any) => <option key={j.id} value={j.id}>{j.title}</option>)}</select>
      <select className={sel} value={out} onChange={e => setOut(e.target.value)}><option value="">All AI results</option><option value="APPROVE">Approve</option><option value="REVIEW">Review</option><option value="REJECT">Reject</option></select>
      <select className={sel} value={min} onChange={e => setMin(+e.target.value)}><option value={0}>Any score</option><option value={80}>80%+</option><option value={60}>60%+</option><option value={40}>40%+</option></select>
      <select className={sel} value={exp} onChange={e => setExp(e.target.value)}><option value="">Any experience</option><option value="0">Under 1 yr</option><option value="1">1–3 yrs</option><option value="3">3+ yrs</option></select></div>
    <Card className="overflow-x-auto p-0"><table className="w-full text-sm min-w-[860px]"><thead className="text-left text-[#5d706b] bg-[#f3f5f2]"><tr>{['Candidate', 'Job role', 'Match score', 'Experience', 'Matched', 'Missing', 'AI recommendation', 'HR decision'].map(h => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
      <tbody>{rows.map((c: any) => { const a = c.analysis; return <tr key={c.id} onClick={() => go('candidate', c.id)} className="border-t border-[#eef2ef] hover:bg-[#f3f8f5] cursor-pointer">
        <td className="px-4 py-3 font-semibold">{c.name}</td><td>{c.jobTitle}</td><td className="font-bold">{a ? a.matchScore + '%' : '—'}</td><td>{c.experience} yrs</td>
        <td>{a ? `${a.matchedSkills.length}/${a.skillDetail.length}` : '—'}</td><td>{a ? a.missingSkills.length : '—'}</td><td>{a ? <Badge kind={a.recommendation} /> : '—'}</td><td>{hrLabel(c)}</td></tr> })}
        {!rows.length && <tr><td colSpan={8} className="p-6 text-center text-[#5d706b]">No candidates match these filters.</td></tr>}</tbody></table></Card></>
}

function CandidatePage({ id }: any) {
  const { cands, refresh, toast, go } = useApp()
  const c = cands.find((x: any) => x.id === id), [comment, setComment] = useState('')
  if (!c) return <p>Candidate not found.</p>
  const a = c.analysis
  const decide = async (decision: string) => { await api(`/candidates/${c.id}/decision`, { method: 'POST', body: { decision, comments: comment } }); await refresh(); toast(`Decision saved: ${decision.replace('_', ' ').toLowerCase()}`) }
  const run = async () => { await api(`/candidates/${c.id}/analyze`, { method: 'POST' }); await refresh(); toast('Analysis complete') }
  if (!a) return <><Title>{c.name}</Title><Card>This resume has not been analyzed yet. <Btn onClick={run} className="mt-3"><Sparkles size={14} />Analyze</Btn></Card></>
  const k = a.recommendation, Icon = k === 'APPROVE' ? Check : k === 'REVIEW' ? AlertTriangle : X
  const SkillRow = ({ s, pct }: any) => <div className="mb-2"><div className="flex justify-between text-sm"><span>{s.matched ? '✓' : s.credit > 0 ? '◐' : '✗'} {s.skill}</span><span className="text-[#5d706b]">{Math.round(s.credit * 100)}%</span></div><Bar1 pct={s.credit * 100} color={s.matched ? C.APPROVE : s.credit > 0 ? C.REVIEW : C.REJECT} /></div>
  return <>
    <button onClick={() => go('candidates')} className="text-sm text-[#2f7d6d] mb-2">← All candidates</button>
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4"><div><h1 className="text-2xl font-extrabold">{c.name}</h1><div className="text-sm text-[#5d706b]">Target role: {c.jobTitle}</div></div>
      <div className="text-right"><div className="text-xs text-[#5d706b]">AI match score</div><div className="text-5xl font-extrabold" style={{ color: C[k] }}>{a.matchScore}%</div></div></div>
    <Card className="mb-4 flex gap-4 items-start" ><div className="rounded-full p-3 text-white" style={{ background: C[k] }}><Icon size={24} /></div>
      <div><div className="text-lg font-extrabold" style={{ color: C[k] }}>{k === 'APPROVE' ? 'APPROVE CANDIDATE' : k === 'REVIEW' ? 'REVIEW CANDIDATE' : 'REJECT CANDIDATE'}</div>
        <p className="text-sm mt-1">{a.explanation}</p><div className="text-xs font-bold mt-3">Why this decision</div>
        <ul className="list-disc ml-5 text-sm text-[#40544f]">{a.reasons.map((r: string) => <li key={r}>{r}</li>)}</ul></div></Card>
    <div className="grid lg:grid-cols-2 gap-4">
      <Card><h3 className="font-bold mb-3">Required skills <span className="font-normal text-xs text-[#5d706b]">(✓ matched, ◐ related experience, ✗ missing)</span></h3>{a.skillDetail.map((s: any) => <SkillRow key={s.skill} s={s} />)}
        <h3 className="font-bold mt-5 mb-3">Preferred skills</h3>{a.preferredDetail.map((s: any) => <SkillRow key={s.skill} s={s} />)}</Card>
      <div className="space-y-4">
        <Card><h3 className="font-bold mb-3">Score breakdown</h3>{[['Required skills', a.breakdown.required], ['Preferred skills', a.breakdown.preferred], ['Experience match', a.breakdown.experience], ['Education match', a.breakdown.education]].map(([l, v]: any) => <div key={l} className="mb-2"><div className="flex justify-between text-sm"><span>{l}</span><span>{v}%</span></div><Bar1 pct={v} /></div>)}</Card>
        <Card><h3 className="font-bold mb-2">Profile</h3><div className="text-sm space-y-1"><div>Email: {c.email || '—'} · Phone: {c.phone || '—'}</div><div>Education: {c.education || '—'}</div><div>Experience: {c.experience} years</div><div>Skills: {c.skills.join(', ')}</div>
          <div>Projects: {c.projects.length ? c.projects.join('; ') : '—'}</div><div>Certifications: {c.certifications.length ? c.certifications.join('; ') : '—'}</div></div></Card>
        <Card><h3 className="font-bold mb-2">HR decision</h3>
          <p className="text-sm mb-2">AI recommendation: <Badge kind={k} /> · HR decision: <b>{hrLabel(c)}</b>{c.hrDecision && <span className="text-[#5d706b]"> by {c.hrDecision.decidedBy}</span>}</p>
          <Input value={comment} onChange={(e: any) => setComment(e.target.value)} placeholder="Optional comment" />
          <div className="flex flex-wrap gap-2 mt-3"><Btn onClick={() => decide('APPROVED')} style={{ background: C.APPROVE }}><Check size={14} />Approve</Btn><Btn onClick={() => decide('ON_REVIEW')} style={{ background: C.REVIEW }}>Put on review</Btn><Btn onClick={() => decide('REJECTED')} style={{ background: C.REJECT }}><X size={14} />Reject</Btn></div>
          <p className="text-xs text-[#5d706b] mt-3">{NOTE}</p></Card></div></div>
    <Card className="mt-4"><h3 className="font-bold mb-2 flex gap-2 items-center"><FileText size={16} />Resume preview ({c.resumeFile})</h3><pre className="text-xs whitespace-pre-wrap max-h-72 overflow-auto bg-[#f3f5f2] rounded-lg p-3">{c.resumeText}</pre></Card></>
}

function Analytics() {
  const { cands, jobs } = useApp()
  const sc = cands.filter((c: any) => c.analysis), n = (o: string) => cands.filter((c: any) => outcome(c) === o).length
  const rate = (o: string) => cands.length ? Math.round(n(o) / cands.length * 100) + '%' : '0%'
  const count = (f: (c: any) => string[]) => { const m: any = {}; sc.forEach((c: any) => f(c).forEach(s => m[s] = (m[s] || 0) + 1)); return Object.entries(m).map(([skill, count]) => ({ skill, count })).sort((a: any, b: any) => b.count - a.count).slice(0, 8) }
  const top = count((c: any) => c.skills), miss = count((c: any) => c.analysis.missingSkills)
  const role = jobs.map((j: any) => ({ skill: j.title, count: cands.filter((c: any) => c.jobId === j.id).length }))
  const Ch = ({ t, d, color }: any) => <Card><h3 className="font-bold mb-2">{t}</h3><ResponsiveContainer height={240}><BarChart data={d} layout="vertical"><XAxis type="number" allowDecimals={false} fontSize={12} /><YAxis type="category" dataKey="skill" width={105} fontSize={11} /><Tooltip /><Bar dataKey="count" fill={color} radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></Card>
  return <><Title>Analytics</Title><div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4"><Stat label="Total candidates" value={cands.length} /><Stat label="Approval rate" value={rate('APPROVE')} color={C.APPROVE} /><Stat label="Rejection rate" value={rate('REJECT')} color={C.REJECT} /><Stat label="Average AI score" value={(sc.length ? Math.round(sc.reduce((s: number, c: any) => s + c.analysis.matchScore, 0) / sc.length) : 0) + '%'} /></div>
    <div className="grid lg:grid-cols-3 gap-4"><Ch t="Most common skills" d={top} color={PINE} /><Ch t="Most missing skills" d={miss} color={C.REJECT} /><Ch t="Candidates by role" d={role} color="#2f7d6d" /></div></>
}

function Fairness() {
  const { settings, refresh, toast } = useApp(), [s, setS] = useState<any>(settings)
  const w = (k: string) => (e: any) => setS({ ...s, weights: { ...s.weights, [k]: +e.target.value } })
  const total = Object.values(s.weights).reduce((a: any, b: any) => a + b, 0) as number
  const save = async () => { await api('/settings', { method: 'PUT', body: s }); await refresh(); toast('Settings saved and all candidates re-scored') }
  return <><Title>AI fairness &amp; settings</Title><div className="grid lg:grid-cols-2 gap-4">
    <Card><h3 className="font-bold mb-2 flex items-center gap-2"><ShieldCheck size={18} />AI fairness &amp; transparency</h3><ul className="list-disc ml-5 text-sm space-y-2">
      <li>The recommendation is based only on job-related qualifications: skills, experience and education level.</li>
      <li>Gender, religion, caste, race, photograph, age, marital status and other sensitive attributes are never used for scoring.</li>
      <li>Every score is explainable: skill matches, weights and thresholds are shown on each candidate.</li>
      <li>Human HR review is required. The AI supports decisions and does not replace human judgment.</li>
      <li>Bias monitoring should be performed regularly by comparing outcomes across candidate groups.</li></ul></Card>
    <Card><h3 className="font-bold mb-3">Scoring weights &amp; thresholds</h3>
      {[['required', 'Required skills'], ['preferred', 'Preferred skills'], ['experience', 'Experience'], ['education', 'Education']].map(([k, l]) => <div key={k} className="flex items-center gap-3 mb-2"><span className="w-36 text-sm">{l}</span><input type="range" min={0} max={100} value={s.weights[k]} onChange={w(k)} className="flex-1" /><span className="w-10 text-sm text-right">{s.weights[k]}</span></div>)}
      <p className="text-xs text-[#5d706b] mb-3">Total {total} (normalized automatically)</p>
      <div className="grid grid-cols-2 gap-3"><div><label className="text-sm font-semibold">Approve at or above</label><Input type="number" value={s.approve} onChange={(e: any) => setS({ ...s, approve: +e.target.value })} /></div><div><label className="text-sm font-semibold">Review at or above</label><Input type="number" value={s.review} onChange={(e: any) => setS({ ...s, review: +e.target.value })} /></div></div>
      <Btn onClick={save} className="mt-4">Save settings</Btn></Card></div></>
}

export default function App() {
  const [authed, setAuthed] = useState(!!localStorage.getItem('token'))
  const [jobs, setJobs] = useState<any[]>([]), [cands, setCands] = useState<any[]>([]), [settings, setSettings] = useState<any>(null)
  const [loadErr, setLoadErr] = useState(''), [page, setPage] = useState<any>({ name: 'dashboard' }), [open, setOpen] = useState(false), [demo, setDemo] = useState(false), [toasts, setToasts] = useState<any[]>([])
  const refresh = useCallback(async () => { try { const [j, c, s] = await Promise.all([api('/jobs'), api('/candidates'), api('/settings')]); setJobs(j); setCands(c); setSettings(s); setLoadErr('') } catch (e: any) { if (e.status === 401) { localStorage.removeItem('token'); setAuthed(false) } else setLoadErr('Cannot reach the server. ' + (e.message || '')) } }, [])
  useEffect(() => { if (authed) refresh() }, [authed])
  const toast = (msg: string, bad = false) => { const id = Math.random(); setToasts(t => [...t, { id, msg, bad }]); setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500) }
  const go = (name: string, id?: number) => { setPage({ name, id }); setOpen(false); setDemo(false); window.scrollTo(0, 0) }
  if (!authed) return <Login onLogin={() => setAuthed(true)} />
  if (!settings) return <div className="p-10 max-w-md"><p className="font-semibold">{loadErr || 'Loading…'}</p><p className="text-sm text-[#5d706b] mt-2">The free hosting plan can take up to a minute to wake the server.</p>{loadErr && <Btn onClick={refresh} className="mt-4">Try again</Btn>}</div>
  const reset = async () => { await api('/demo/reset', { method: 'POST' }); await refresh(); toast('Demo data reset'); go('dashboard') }
  const pick = (name: string) => cands.find((c: any) => c.name === name)?.id
  const active = page.name === 'candidate' ? 'candidates' : page.name === 'newjob' ? 'jobs' : page.name
  const body = { dashboard: <Dashboard />, jobs: <Jobs />, newjob: <NewJob />, upload: <UploadPage key={jobs.length} />, candidates: <Candidates />, candidate: <CandidatePage id={page.id} />, analytics: <Analytics />, fairness: <Fairness /> } as any
  return <Ctx.Provider value={{ jobs, cands, settings, refresh, toast, go }}>
    <div className="min-h-screen md:flex">
      <aside className={`fixed md:sticky top-0 z-30 h-screen w-60 shrink-0 text-white p-4 flex flex-col transition-transform ${open ? '' : '-translate-x-full md:translate-x-0'}`} style={{ background: PINE }}>
        <div className="flex items-center gap-2 px-2 mb-1"><Sparkles size={20} /><span className="font-extrabold text-lg">AI ResumeScreen</span></div>
        <div className="text-xs text-white/60 px-2 mb-6">Hire Smarter. Faster. Fairer.</div>
        {NAV.map(([k, l, I]: any) => <button key={k} onClick={() => go(k)} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold mb-1 text-left ${active === k ? 'bg-white/15' : 'hover:bg-white/10 text-white/80'}`}><I size={17} />{l}</button>)}
        <button onClick={() => { localStorage.removeItem('token'); setAuthed(false) }} className="mt-auto flex items-center gap-3 px-3 py-2 text-sm text-white/70"><LogOut size={16} />Log out</button></aside>
      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-20 flex items-center gap-3 bg-white/90 backdrop-blur border-b border-[#dde4df] px-4 py-3">
          <button className="md:hidden" onClick={() => setOpen(!open)}><Menu /></button><div className="flex-1 text-sm text-[#5d706b] hidden sm:block">Signed in as {localStorage.getItem('user')}</div>
          <Btn kind="ghost" onClick={() => setDemo(true)}><PlayCircle size={16} />Demo mode</Btn><Btn kind="ghost" onClick={reset}><RotateCcw size={16} />Reset demo data</Btn></header>
        <main className="p-4 md:p-8 max-w-6xl">{body[page.name]}</main></div></div>
    {demo && <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={() => setDemo(false)}><Card className="max-w-md w-full" ><div onClick={e => e.stopPropagation()}>
      <h3 className="font-extrabold text-lg mb-1">Demo mode</h3><p className="text-sm text-[#5d706b] mb-4">Jump straight to a sample AI Engineer candidate.</p>
      {[['Aarav Mehta', 'Strong candidate → APPROVE', 'APPROVE'], ['Sarah Sharma', 'Average candidate → REVIEW', 'REVIEW'], ['Kunal Verma', 'Non-AI web developer → REJECT', 'REJECT']].map(([n, l, k]) => <button key={n} onClick={() => go('candidate', pick(n))} className="w-full flex justify-between items-center border border-[#dde4df] rounded-lg p-3 mb-2 hover:bg-[#f3f8f5]"><span className="font-semibold text-sm">{l}</span><Badge kind={k} /></button>)}
      <Btn kind="ghost" onClick={() => go('upload')} className="w-full justify-center">Upload your own resume</Btn></div></Card></div>}
    <div className="fixed bottom-4 right-4 z-50 space-y-2">{toasts.map(t => <div key={t.id} className="rounded-lg px-4 py-3 text-sm text-white shadow-lg" style={{ background: t.bad ? C.REJECT : PINE }}>{t.msg}</div>)}</div>
  </Ctx.Provider>
}
