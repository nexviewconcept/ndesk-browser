const fs = require('fs');
const { execSync } = require('child_process');

const code = fs.readFileSync('D:/NexPortal/NDeskBrowser/src/screens/SettingsScreen.jsx', 'utf-8');
const lines = code.split('\n');

for (let i = 150; i <= 350; i += 20) {
  const test = `
import React from 'react';
export const SettingsScreen = () => {
${lines.slice(27, i).join('\n')}
};
`;
  fs.writeFileSync('D:/NexPortal/NDeskBrowser/test_bin.jsx', test);
  try {
    execSync('npx eslint D:/NexPortal/NDeskBrowser/test_bin.jsx', { stdio: 'ignore' });
    console.log(`Lines 28 to ${i} PASSED`);
  } catch (e) {
    console.log(`Lines 28 to ${i} FAILED`);
  }
}
