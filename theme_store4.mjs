import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  /className="flex items-center gap-2 px-4 py-2 bg-\[#FF0055\] text-\[#E0E7FF\] rounded-full text-xs font-bold hover:bg-\[#FF0055\]\/80 transition-colors shadow-lg shadow-\[#FF0055\]\/20"/g,
  'className="flex items-center gap-2 px-4 py-2 bg-transparent border border-[#FF0055] text-[#FF0055] rounded-full text-xs font-bold hover:bg-[#FF0055] hover:text-[#0B0E14] transition-all hover:shadow-[0_0_15px_rgba(255,0,85,0.6)]"'
);

fs.writeFileSync('src/App.tsx', content);
