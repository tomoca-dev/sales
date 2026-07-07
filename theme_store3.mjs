import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  /className="w-full pl-12 pr-4 py-3 bg-\[#151A22\] rounded-2xl border border-\[#00E5FF\]\/10 focus:outline-none focus:border-\[#00E5FF\] transition-all text-sm"/g,
  'className="w-full pl-12 pr-4 py-3 bg-[#0B0E14] rounded-2xl border border-[#00E5FF]/20 focus:outline-none focus:border-[#00E5FF] focus:shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all text-sm text-[#E0E7FF]"'
);

content = content.replace(
  /className="w-full pl-12 pr-4 py-3 bg-\[#151A22\] rounded-2xl border border-\[#00E5FF\]\/10 focus:outline-none focus:border-\[#00E5FF\] transition-all text-sm appearance-none"/g,
  'className="w-full pl-12 pr-4 py-3 bg-[#0B0E14] rounded-2xl border border-[#00E5FF]/20 focus:outline-none focus:border-[#00E5FF] focus:shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all text-sm appearance-none text-[#E0E7FF]"'
);

fs.writeFileSync('src/App.tsx', content);
