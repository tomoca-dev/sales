import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  /className="absolute top-4 right-4 px-3 py-1 bg-\[#151A22\]\/90 backdrop-blur-sm rounded-full text-\[10px\] font-bold tracking-wider uppercase text-\[#00E5FF\]"/g,
  'className="absolute top-4 right-4 px-3 py-1 bg-[#151A22]/90 backdrop-blur-sm rounded-full border border-[#00E5FF]/40 shadow-[0_0_10px_rgba(0,229,255,0.2)] text-[10px] font-bold tracking-wider uppercase text-[#00E5FF]"'
);

content = content.replace(
  /<Radar\n +name="Flavor"\n +dataKey="A"\n +stroke="#FF0055"/g,
  '<Radar\n            name="Flavor"\n            dataKey="A"\n            stroke="#FF0055"\n            strokeWidth={2}\n            style={{ filter: "drop-shadow(0 0 8px rgba(255,0,85,0.6))" }}'
);

// Wait, the previous replace changed `#00E5FF` to `#FF0055` for Radar stroke?
// Let's check what Radar actually has
