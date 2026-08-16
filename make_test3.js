const fs = require('fs');
const code = fs.readFileSync('D:/NexPortal/NDeskBrowser/src/screens/SettingsScreen.jsx', 'utf-8');
const lines = code.split('\n');

const test3 = `
${lines.slice(0, 150).join('\n')}
  return null;
};
`;
fs.writeFileSync('D:/NexPortal/NDeskBrowser/test3.jsx', test3);

const test4 = `
${lines.slice(0, 250).join('\n')}
  return null;
};
`;
fs.writeFileSync('D:/NexPortal/NDeskBrowser/test4.jsx', test4);
