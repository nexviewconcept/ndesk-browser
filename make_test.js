const fs = require('fs');
const code = fs.readFileSync('D:/NexPortal/NDeskBrowser/src/screens/SettingsScreen.jsx', 'utf-8');
const lines = code.split('\n');

const test = `
import React from 'react';
export const Test = () => {
  return (
${lines.slice(351, 781).join('\n')}
  );
};
`;
fs.writeFileSync('D:/NexPortal/NDeskBrowser/test.jsx', test);
