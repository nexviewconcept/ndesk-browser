const fs = require('fs');
const code = fs.readFileSync('D:/NexPortal/NDeskBrowser/src/screens/SettingsScreen.jsx', 'utf-8');
const lines = code.split('\n');

const test = lines.slice(0, 784).join('\n');
fs.writeFileSync('D:/NexPortal/NDeskBrowser/test_no_styles.jsx', test);
