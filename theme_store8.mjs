import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  /<Radar\n\s+name="Flavor"\n\s+dataKey="A"\n\s+stroke="#00E5FF"/g,
  '<Radar\n            name="Flavor"\n            dataKey="A"\n            stroke="#00E5FF"\n            strokeWidth={2}\n            style={{ filter: "drop-shadow(0 0 5px rgba(0,229,255,0.7))" }}'
);

fs.writeFileSync('src/App.tsx', content);
