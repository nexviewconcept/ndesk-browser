const fs = require('fs');
const code = fs.readFileSync('D:/NexPortal/NDeskBrowser/src/screens/SettingsScreen.jsx', 'utf-8');
const lines = code.split('\n');

for (let i = 0; i < lines.length; i++) {
  let l = lines[i];
  if (l.includes('//') && l.includes('}')) {
    console.log(`Line ${i+1}: ${l.trim()}`);
  }
}
