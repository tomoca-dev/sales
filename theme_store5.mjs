import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  /className="w-full py-4 bg-\[#FF0055\] text-\[#E0E7FF\] rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-\[#FF0055\]\/80 transition-all"/g,
  'className="w-full py-4 bg-[#FF0055] text-[#0B0E14] rounded-2xl text-xs font-bold uppercase tracking-widest hover:shadow-[0_0_20px_rgba(255,0,85,0.6)] transition-all"'
);

// and also the floating 'Deploy Mobile Unit' button if the user happens to have that
content = content.replace(
  /className="mt-4 w-full py-3 bg-\[#FF0055\] text-\[#E0E7FF\] rounded-2xl text-\[8px\] font-bold uppercase tracking-widest hover:bg-\[#FF0055\]\/80 transition-all"/g,
  'className="mt-4 w-full py-3 bg-[#FF0055] text-[#0B0E14] rounded-2xl text-[8px] font-bold uppercase tracking-widest hover:shadow-[0_0_20px_rgba(255,0,85,0.6)] transition-all"'
);

fs.writeFileSync('src/App.tsx', content);
