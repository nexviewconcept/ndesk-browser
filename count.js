const fs = require('fs');
const code = fs.readFileSync('D:/NexPortal/NDeskBrowser/src/screens/SettingsScreen.jsx', 'utf-8');
const lines = code.split('\n');

let stack = [];
for (let i = 27; i < 783; i++) {
  let l = lines[i];
  l = l.replace(/'[^']*'/g, '');
  l = l.replace(/"[^"]*"/g, '');
  if (l.includes('//')) l = l.split('//')[0];
  
  for(let j=0; j < l.length; j++) {
    const c = l[j];
    if (c === '[') stack.push(i+1);
    if (c === ']') {
      if (stack.length > 0) stack.pop();
      else console.log(`Extra ] at line ${i+1}`);
    }
  }
}
