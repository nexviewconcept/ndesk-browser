const fs = require('fs');
const code = fs.readFileSync('D:/NexPortal/NDeskBrowser/src/screens/SettingsScreen.jsx', 'utf-8');
const tags = [];
const regex = /<\/?([A-Z][a-zA-Z0-9]*)[^>]*>/g;
let match;
while ((match = regex.exec(code)) !== null) {
  const full = match[0];
  const name = match[1];
  if (full.endsWith('/>')) continue; 
  if (full.startsWith('</')) {
    const last = tags.pop();
    if (last && last.name !== name) {
      console.log("Mismatch:", last.name, "closed by", name, "at line", code.substring(0, match.index).split('\n').length);
    }
  } else {
    tags.push({name, line: code.substring(0, match.index).split('\n').length});
  }
}
console.log("Unclosed tags:", tags);
