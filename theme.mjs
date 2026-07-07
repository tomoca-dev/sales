import fs from 'fs';

let lines = fs.readFileSync('src/App.tsx', 'utf8').split('\n');

lines[3838] = lines[3838].replace('#00E5FF', '#FF0055');
lines[3868] = lines[3868].replace('#00E5FF', '#00FF9D');
lines[3883] = lines[3883].replace('#00E5FF', '#8B5CF6'); // Neon Purple

fs.writeFileSync('src/App.tsx', lines.join('\n'));
