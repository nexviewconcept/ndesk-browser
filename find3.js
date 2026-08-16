const fs = require('fs');
const code = fs.readFileSync('D:/NexPortal/NDeskBrowser/src/screens/SettingsScreen.jsx', 'utf-8');

let brace = 0;
let paren = 0;
let bracket = 0;

for (let i = 0; i < code.length; i++) {
  const c = code[i];
  if (c === '{') brace++;
  if (c === '}') brace--;
  if (c === '(') paren++;
  if (c === ')') paren--;
  if (c === '[') bracket++;
  if (c === ']') bracket--;
}

console.log({ brace, paren, bracket });
