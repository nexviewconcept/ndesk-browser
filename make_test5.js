const fs = require('fs');
const code = fs.readFileSync('D:/NexPortal/NDeskBrowser/src/screens/SettingsScreen.jsx', 'utf-8');
const lines = code.split('\n');

const test5 = `
${lines.slice(0, 75).join('\n')}
  return null;
};
`;
fs.writeFileSync('D:/NexPortal/NDeskBrowser/test5.jsx', test5);

const test6 = `
${lines.slice(0, 100).join('\n')}
  return null;
};
`;
fs.writeFileSync('D:/NexPortal/NDeskBrowser/test6.jsx', test6);
