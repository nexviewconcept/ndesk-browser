const fs = require('fs');
const code = fs.readFileSync('D:/NexPortal/NDeskBrowser/src/screens/SettingsScreen.jsx', 'utf-8');

const opens = (code.match(/\/\*/g) || []).length;
const closes = (code.match(/\*\//g) || []).length;

console.log(`Block comments: ${opens} open, ${closes} close`);
