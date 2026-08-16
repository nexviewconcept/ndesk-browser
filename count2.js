const fs = require('fs');
const code = fs.readFileSync('D:/NexPortal/NDeskBrowser/src/screens/SettingsScreen.jsx', 'utf-8');
const lines = code.split('\n');

let opens = 0;
let closes = 0;
for (let i = 783; i < lines.length; i++) {
  let l = lines[i];
  l = l.replace(/'[^']*'/g, '');
  l = l.replace(/"[^"]*"/g, '');
  if (l.includes('//')) l = l.split('//')[0];
  
  for(let c of l) {
    if (c === '{') opens++;
    if (c === '}') closes++;
  }
}
console.log(`After line 783: Opens: ${opens}, Closes: ${closes}`);
