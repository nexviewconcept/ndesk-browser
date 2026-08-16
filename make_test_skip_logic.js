const fs = require('fs');
const code = fs.readFileSync('D:/NexPortal/NDeskBrowser/src/screens/SettingsScreen.jsx', 'utf-8');
const lines = code.split('\n');

const test = `
${lines.slice(0, 150).join('\n')}
${lines.slice(350).join('\n')}
`;
fs.writeFileSync('D:/NexPortal/NDeskBrowser/test_compile_skip_logic.jsx', test);
