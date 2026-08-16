const fs = require('fs');
const code = fs.readFileSync('D:/NexPortal/NDeskBrowser/src/screens/SettingsScreen.jsx', 'utf-8');
const stack = [];
let l = 1;
for (let i = 0; i < code.length; i++) {
  const c = code[i];
  if (c === '\n') l++;
  if (c === '{') stack.push(l);
  if (c === '}') {
    if (stack.length > 0) stack.pop();
    else console.log("Extra } at line", l);
  }
}
console.log("Unclosed { at lines:", stack);
