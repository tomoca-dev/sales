import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  /hover:border-\[#00E5FF\]\/20 transition-all hover:shadow-xl hover:shadow-\[#FF0055\]\/5/g,
  'hover:border-[#00E5FF]/60 transition-all duration-500 hover:shadow-[0_0_30px_rgba(0,229,255,0.15)] hover:-translate-y-1'
);

content = content.replace(
  /border border-\[#00E5FF\]\/5 hover/g,
  'border border-[#00E5FF]/20 shadow-[0_0_15px_rgba(0,229,255,0.02)] hover'
);

fs.writeFileSync('src/App.tsx', content);
