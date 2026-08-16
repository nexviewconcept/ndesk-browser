const fs = require('fs');
const code = fs.readFileSync('D:/NexPortal/NDeskBrowser/src/screens/SettingsScreen.jsx', 'utf-8');
const lines = code.split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('/*') || lines[i].includes('*/')) {
    console.log(`Line ${i+1}: ${lines[i].trim()}`);
  }
}
