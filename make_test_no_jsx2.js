const fs = require('fs');
const code = fs.readFileSync('D:/NexPortal/NDeskBrowser/src/screens/SettingsScreen.jsx', 'utf-8');
const lines = code.split('\n');

const test_no_jsx = `
${lines.slice(0, 350).join('\n')}
};
`;
fs.writeFileSync('D:/NexPortal/NDeskBrowser/test_no_jsx2.jsx', test_no_jsx);
