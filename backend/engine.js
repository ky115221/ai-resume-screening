// Prototype "AI" analyzer: skill extraction + synonyms + contextual (related-skill) matching + weighted scoring.
export const ALIASES = {
  'Python': ['python'], 'Machine Learning': ['machine learning', 'ml', 'supervised learning', 'xgboost'],
  'Deep Learning': ['deep learning', 'neural network', 'neural networks', 'cnn', 'rnn', 'lstm'],
  'NLP': ['nlp', 'natural language processing', 'text mining'], 'TensorFlow': ['tensorflow', 'keras'],
  'PyTorch': ['pytorch', 'torch'], 'Pandas': ['pandas'], 'NumPy': ['numpy'],
  'Scikit-learn': ['scikit-learn', 'sklearn', 'scikit learn'],
  'SQL': ['sql', 'mysql', 'postgresql', 'postgres', 'sqlite'], 'Git/GitHub': ['git', 'github', 'git/github'],
  'Generative AI': ['generative ai', 'generative artificial intelligence', 'genai', 'gen ai'],
  'LLMs': ['llm', 'llms', 'large language model', 'large language models', 'gpt'],
  'Computer Vision': ['computer vision', 'opencv', 'image classification', 'object detection'],
  'Hugging Face': ['hugging face', 'huggingface', 'transformers'], 'LangChain': ['langchain'],
  'AWS': ['aws', 'amazon web services', 'sagemaker', 'cloud/aws'], 'MLOps': ['mlops', 'mlflow', 'kubeflow'],
  'Docker': ['docker'], 'Statistics': ['statistics', 'statistical analysis'], 'Excel': ['excel', 'advanced excel'],
  'Tableau': ['tableau'], 'Power BI': ['power bi', 'powerbi'], 'Data Visualization': ['data visualization', 'matplotlib', 'seaborn'],
  'Flask': ['flask'], 'Django': ['django'], 'REST APIs': ['rest api', 'rest apis', 'restful'],
  'HTML': ['html', 'html5'], 'CSS': ['css', 'css3'], 'JavaScript': ['javascript', 'js'], 'React': ['react', 'reactjs'],
  'WordPress': ['wordpress'], 'Node.js': ['node.js', 'nodejs', 'node'], 'Java': ['java'],
};
// Contextual matching: a skill can be (partly) evidenced by related skills (credit 0-1).
const RELATED = {
  'Machine Learning': { 'Scikit-learn': .9, 'Deep Learning': .9, TensorFlow: .8, PyTorch: .8 },
  'Deep Learning': { TensorFlow: .9, PyTorch: .9, 'Computer Vision': .6, NLP: .4 },
  TensorFlow: { PyTorch: .5 }, PyTorch: { TensorFlow: .5 }, NLP: { 'Hugging Face': .6, LLMs: .5 },
  'Scikit-learn': { 'Machine Learning': .5 }, Pandas: { NumPy: .4 }, NumPy: { Pandas: .4 },
  'Generative AI': { LLMs: .9, LangChain: .7, 'Hugging Face': .5 }, LLMs: { 'Generative AI': .8, LangChain: .7 },
  'Computer Vision': { 'Deep Learning': .3 }, MLOps: { Docker: .4, AWS: .3 },
  Python: { Django: .8, Flask: .8, Pandas: .8, NumPy: .8 }, 'Data Visualization': { Tableau: .8, 'Power BI': .8 },
};
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const canon = name => {
  const n = name.trim().toLowerCase();
  for (const [c, al] of Object.entries(ALIASES)) if (c.toLowerCase() === n || al.includes(n)) return c;
  return name.trim();
};
export function extractSkills(text) {
  const t = text.toLowerCase(), out = [];
  for (const [c, al] of Object.entries(ALIASES))
    if (al.some(a => new RegExp(`(^|[^a-z0-9+#])${esc(a)}($|[^a-z0-9+#])`).test(t))) out.push(c);
  return out;
}
const section = (text, names) => {
  const head = /^(education|experience|work experience|projects?|skills|technical skills|certifications?|summary|profile|achievements)\s*:?$/i;
  let on = false; const res = [];
  for (const l of text.split('\n').map(x => x.trim())) {
    if (head.test(l)) { on = names.test(l); continue; }
    if (on && l) res.push(l.replace(/^[-•*▪\s]+/, ''));
  }
  return res.filter(l => !/^none$/i.test(l));
};
export function parseResume(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const years = [...text.matchAll(/(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)/gi)].map(m => parseFloat(m[1])).filter(n => n < 40);
  const edu = section(text, /education/i);
  const eduLine = edu[0] || (text.match(/(b\.?tech|bachelor|m\.?tech|master|m\.?sc|b\.?sc|bca|mca|ph\.?d|diploma)[^\n]*/i) || [''])[0];
  return {
    name: lines.find(l => /^[A-Za-z][A-Za-z .'-]{2,40}$/.test(l)) || 'Unknown Candidate',
    email: (text.match(/[\w.+-]+@[\w-]+\.[\w.]+/) || [''])[0], phone: (text.match(/\+?\d[\d\s-]{8,14}\d/) || [''])[0],
    education: eduLine, experience: years.length ? Math.max(...years) : 0,
    skills: extractSkills(text), projects: section(text, /project/i), certifications: section(text, /certification/i),
  };
}
const level = s => /ph\.?d/i.test(s) ? 4 : /m\.?tech|master|m\.?sc|mca/i.test(s) ? 3 : /b\.?tech|bachelor|b\.?sc|bca|b\.?e\b/i.test(s) ? 2 : /diploma/i.test(s) ? 1 : 0;
export const DEFAULT_SETTINGS = { weights: { required: 60, preferred: 15, experience: 15, education: 10 }, approve: 80, review: 60 };

export function score(cand, job, st = DEFAULT_SETTINGS) {
  const have = new Set(cand.skills);
  const credit = s => have.has(s) ? 1 : Math.max(0, ...Object.entries(RELATED[s] || {}).filter(([k]) => have.has(k)).map(([, v]) => v));
  const run = list => list.map(canon).map(s => ({ skill: s, credit: credit(s), matched: credit(s) >= .8 }));
  const req = run(job.requiredSkills), pref = run(job.preferredSkills);
  const avg = a => a.length ? a.reduce((x, y) => x + y.credit, 0) / a.length : 1;
  const reqS = avg(req), prefS = avg(pref), need = job.minimumExperience || 0;
  const expS = (need ? Math.min(1, cand.experience / need) : 1) * (0.3 + 0.7 * reqS); // experience counts more when job-relevant
  const lv = level(cand.education), needLv = level(job.education || 'Bachelor') || 2;
  const field = /comput|data|information|software|artificial|statistic|math|electronic|\bit\b/i.test(cand.education) ? 1 : .6;
  const eduS = lv ? Math.min(1, lv / needLv) * .5 + field * .5 : .3;
  const w = st.weights, tot = (w.required + w.preferred + w.experience + w.education) || 100;
  const final = Math.round((reqS * w.required + prefS * w.preferred + expS * w.experience + eduS * w.education) / tot * 100);
  const approve = job.threshold || st.approve;
  const recommendation = final >= approve ? 'APPROVE' : final >= st.review ? 'REVIEW' : 'REJECT';
  const matched = req.filter(r => r.matched).map(r => r.skill), missing = req.filter(r => !r.matched).map(r => r.skill);
  const reasons = [
    `Required skills: ${matched.length}/${req.length} matched (${Math.round(reqS * 100)}% weighted coverage, ${w.required}% of score).`,
    `Preferred skills: ${pref.filter(p => p.matched).length}/${pref.length} matched.`,
    `Experience: ${cand.experience} yrs vs ${need} required.`,
    `Education: ${cand.education || 'not detected'}.`,
    `Score ${final}% against approve ≥ ${approve}% and review ≥ ${st.review}% gives ${recommendation}.`,
  ];
  const top = missing.slice(0, 3).join(', ');
  const explanation = recommendation === 'APPROVE'
    ? `Strong match for ${job.title}. Candidate covers ${matched.length} of ${req.length} required skills${missing.length ? `; gaps: ${top}` : ''}, with ${cand.experience} years of experience.`
    : recommendation === 'REVIEW'
      ? `Partial match for ${job.title}. ${matched.length}/${req.length} required skills found. Missing: ${top || 'none'}. A recruiter should review relevant projects and experience.`
      : `Candidate profile does not sufficiently match the required skills for ${job.title}. Only ${matched.length}/${req.length} required skills found; missing: ${top}.`;
  return {
    matchScore: final, recommendation, explanation, reasons, matchedSkills: matched, missingSkills: missing,
    skillDetail: req, preferredDetail: pref, experienceScore: Math.round(expS * 100), educationScore: Math.round(eduS * 100),
    breakdown: { required: Math.round(reqS * 100), preferred: Math.round(prefS * 100), experience: Math.round(expS * 100), education: Math.round(eduS * 100) },
  };
}
