import fs from 'fs';

let lines = fs.readFileSync('src/App.tsx', 'utf8').split('\n');
lines[3050] = lines[3050].replace(/#00E5FF/g, '#FF0055');

fs.writeFileSync('src/App.tsx', lines.join('\n'));
