import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace '$' when it's immediately preceding a number or comma
content = content.replace(/\$([0-9][0-9,]*(\.[0-9]+)?)/g, 'ETB $1');

// Replace '$' when it precedes a JSX curly brace expression e.g. `${someVar}`
content = content.replace(/\$(?=\{)/g, 'ETB ');
// Also `$${` inside template strings
content = content.replace(/\$(?=\$\{)/g, 'ETB ');

// We also need to be careful with template strings that might have `$${...}`, so above catches `$(?=\$\{)`
// Wait, `$${user.driverProfile...}`
// `$` then `${` -> `ETB ${`

fs.writeFileSync('src/App.tsx', content);
console.log('Replaced currency in App.tsx');

let serverContent = fs.readFileSync('server.ts', 'utf8');
serverContent = serverContent.replace(/\$([0-9][0-9,]*(\.[0-9]+)?)/g, 'ETB $1');
serverContent = serverContent.replace(/\$(?=\{)/g, 'ETB ');
serverContent = serverContent.replace(/\$(?=\$\{)/g, 'ETB ');
fs.writeFileSync('server.ts', serverContent);
console.log('Replaced currency in server.ts');

let typesContent = fs.readFileSync('src/types.ts', 'utf8');
typesContent = typesContent.replace(/\$([0-9][0-9,]*(\.[0-9]+)?)/g, 'ETB $1');
typesContent = typesContent.replace(/\$(?=\{)/g, 'ETB ');
typesContent = typesContent.replace(/\$(?=\$\{)/g, 'ETB ');
fs.writeFileSync('src/types.ts', typesContent);
console.log('Replaced currency in src/types.ts');
