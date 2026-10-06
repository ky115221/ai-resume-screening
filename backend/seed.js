const AI = { required: ['Python','Machine Learning','Deep Learning','NLP','TensorFlow','PyTorch','Pandas','NumPy','Scikit-learn','SQL'], preferred: ['Generative AI','LLMs','Computer Vision','Hugging Face','LangChain','AWS'] };
const J = (title, department, description, requiredSkills, preferredSkills, minimumExperience) => ({ title, department, description, requiredSkills, preferredSkills, minimumExperience, education: 'Bachelor', threshold: 80 });
export const JOBS = [
  J('AI Engineer', 'Engineering', 'Build and deploy machine learning and NLP systems.', AI.required, AI.preferred, 2),
  J('Data Scientist', 'Analytics', 'Model business data and communicate insights.', ['Python','Machine Learning','Statistics','Pandas','SQL'], ['Data Visualization','Tableau'], 2),
  J('Python Developer', 'Engineering', 'Build backend services.', ['Python','Flask','SQL','Git/GitHub','REST APIs'], ['Docker','AWS'], 1),
  J('ML Engineer', 'Engineering', 'Productionise ML models.', ['Python','Machine Learning','TensorFlow','Docker'], ['MLOps','AWS'], 3),
  J('Data Analyst', 'Analytics', 'Dashboards and reporting.', ['SQL','Excel','Data Visualization','Statistics'], ['Power BI','Python'], 1),
];
const R = (name, edu, years, skills, projects, certs = []) =>
  `${name}\n${name.split(' ')[0].toLowerCase()}@example.com\n+91 98765 43210\n\nSummary\n${years} years of experience in software.\n\nEducation\n${edu}\n\nSkills\n${skills}\n\nProjects\n${projects.map(p => '- ' + p).join('\n')}\n\nCertifications\n${certs.map(p => '- ' + p).join('\n') || '- None'}\n`;
export const CANDIDATES = [
  ['AI Engineer', R('Aarav Mehta', 'M.Tech Computer Science', 4, 'Python, Machine Learning, Deep Learning, NLP, TensorFlow, PyTorch, Pandas, NumPy, Scikit-learn, Git, Generative AI, LLMs, Hugging Face', ['LLM document assistant', 'Transformer-based sentiment classifier', 'Image classification with CNN'], ['Deep Learning Specialization'])],
  ['AI Engineer', R('Priya Nair', 'B.Tech Computer Science', 2.5, 'Python, ML, Deep Learning, NLP, TensorFlow, Pandas, NumPy, sklearn', ['AI Chatbot', 'Resume Classification System', 'Image Classification'])],
  ['AI Engineer', R('Sarah Sharma', 'B.Sc Information Technology', 1.5, 'Python, Machine Learning, Pandas, NumPy, Scikit-learn, Keras, Git', ['House price prediction', 'Customer churn model'])],
  ['AI Engineer', R('Rahul Singh', 'BCA', 1, 'Python, Machine Learning, Scikit-learn, Pandas, SQL, Excel', ['Sales dashboard', 'Basic regression notebook'])],
  ['AI Engineer', R('Kunal Verma', 'B.Com', 3, 'HTML, CSS, JavaScript, React, WordPress, Node.js, Python, SQL', ['Portfolio website', 'WordPress e-commerce store'])],
  ['Data Analyst', R('Meera Iyer', 'B.Sc Statistics', 2, 'SQL, Excel, Tableau, Statistics, Python, Data Visualization', ['Retail sales dashboard'])],
  ['Python Developer', R('Dev Patel', 'B.Tech Information Technology', 2, 'Python, Flask, SQL, Git, REST APIs, Docker', ['Inventory REST API'])],
];
