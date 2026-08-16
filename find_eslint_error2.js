const fs = require('fs');
const { execSync } = require('child_process');

const code = fs.readFileSync('D:/NexPortal/NDeskBrowser/src/screens/SettingsScreen.jsx', 'utf-8');
const lines = code.split('\n');
const slices = [88, 93, 104, 114, 127, 133, 158, 224, 257, 277, 295, 350];

for (const i of slices) {
  const test = `
import React from 'react';
export const SettingsScreen = () => {
${lines.slice(27, i).join('\n')}
};
`;
  fs.writeFileSync('D:/NexPortal/NDeskBrowser/test_bin2.jsx', test);
  try {
    execSync('npx eslint D:/NexPortal/NDeskBrowser/test_bin2.jsx', { stdio: 'ignore' });
    console.log(`Lines 28 to ${i} PASSED`);
  } catch (e) {
    console.log(`Lines 28 to ${i} FAILED`);
  }
}
