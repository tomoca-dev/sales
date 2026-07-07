import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  /<h2 className="serif text-4xl font-light">\n *\{isBreakfastTime \? 'Good Morning,' : isLunchTime \? 'Lunch is Served,' : 'Welcome Back,'\} \{user\.name\.split\(' '\)\[0\]\}\n *<\/h2>/,
  '<h2 className="serif text-4xl font-light text-[#00E5FF] drop-shadow-[0_0_8px_rgba(0,229,255,0.4)]">\n              {isBreakfastTime ? \'Good Morning,\' : isLunchTime ? \'Lunch is Served,\' : \'Welcome Back,\'} {user.name.split(\' \')[0]}\n            </h2>'
);

content = content.replace(
  /<h3 className="serif text-2xl font-medium">\{coffee\.name\}<\/h3>/g,
  '<h3 className="serif text-2xl font-medium text-[#E0E7FF]">{coffee.name}</h3>'
);

content = content.replace(
  /<h3 className="serif text-2xl font-medium">\{item\.name\}<\/h3>/g,
  '<h3 className="serif text-2xl font-medium text-[#E0E7FF]">{item.name}</h3>'
);

content = content.replace(
  /<div className="p-4 bg-\[#0B0E14\] rounded-2xl">/g,
  '<div className="p-4 bg-[#0B0E14] rounded-2xl border border-[#00E5FF]/10 shadow-[inner_0_0_10px_rgba(0,229,255,0.05)]">'
);

content = content.replace(
  /class="flex gap-2 p-1 bg-\[#151A22\] rounded-full border border-\[#00E5FF\]\/10 shadow-sm overflow-x-auto no-scrollbar"/g,
  'className="flex gap-2 p-1 bg-[#0B0E14] rounded-full border border-[#00E5FF]/20 shadow-[0_0_15px_rgba(0,229,255,0.1)] overflow-x-auto no-scrollbar"'
);

// I noticed the category bar had `class=` instead of `className=` in my regex, wait. 
// let's do search and replace for className 
content = content.replace(
  /className="flex gap-2 p-1 bg-\[#151A22\] rounded-full border border-\[#00E5FF\]\/10 shadow-sm overflow-x-auto no-scrollbar"/g,
  'className="flex gap-2 p-1 bg-[#0B0E14] rounded-full border border-[#00E5FF]/20 shadow-[0_0_15px_rgba(0,229,255,0.1)] overflow-x-auto no-scrollbar"'
);

fs.writeFileSync('src/App.tsx', content);
