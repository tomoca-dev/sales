import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  /className="p-6 bg-\[#FF0055\] text-\[#E0E7FF\] rounded-\[32px\] shadow-xl shadow-\[#FF0055\]\/20 relative overflow-hidden"/g,
  'className="p-6 bg-[#151A22] border border-[#FF0055]/50 text-[#E0E7FF] rounded-[32px] shadow-[0_0_20px_rgba(255,0,85,0.15)] relative overflow-hidden"'
);

// We made the recommendation H3 black earlier, let's reverse that to neon pink
content = content.replace(
  /<h3 className="serif text-xl text-\[#0B0E14\] font-bold">AI Recommendation for You<\/h3>/g,
  '<h3 className="serif text-xl text-[#FF0055] font-bold drop-shadow-[0_0_5px_rgba(255,0,85,0.8)]">AI Recommendation for You</h3>'
);

// Update icon container
content = content.replace(
  /<div className="p-2 bg-\[#151A22\]\/20 rounded-xl">/g,
  '<div className="p-2 bg-[#FF0055]/10 text-[#FF0055] rounded-xl">'
);

fs.writeFileSync('src/App.tsx', content);
