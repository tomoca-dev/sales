import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');
content = content.replace(/<Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba\(0, 229, 255, 0\.1\)' }}/g, 
"<Tooltip contentStyle={{ borderRadius: '16px', border: '1px solid #1F2937', backgroundColor: '#0B0E14', color: '#E0E7FF', boxShadow: '0 10px 30px rgba(0, 229, 255, 0.1)' }} itemStyle={{ color: '#00E5FF' }}");
fs.writeFileSync('src/App.tsx', content);
