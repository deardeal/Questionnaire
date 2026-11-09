import {readFile,writeFile} from 'node:fs/promises';
import {SURVEY} from '../server/survey.mjs';
import {DEMOGRAPHICS} from '../server/config.mjs';
const publicSurvey=structuredClone(SURVEY);
for(const c of publicSurvey.charts)for(const q of c.questions)delete q.answer;
await writeFile('public/data.js',`const SURVEY = ${JSON.stringify(publicSurvey)};\nconst DEMOGRAPHICS = ${JSON.stringify(DEMOGRAPHICS)};\n`);
const html=await readFile('public/index.html','utf8');
for(const name of ['hue-1','hue-2','hue-3','hue-4','admin'])await writeFile(`public/${name}.html`,html);
console.log('Built shared survey pages; scoring keys excluded from public bundle.');
