const fs = require('fs');
const { execSync } = require('child_process');

const code = fs.readFileSync('D:/NexPortal/NDeskBrowser/src/screens/SettingsScreen.jsx', 'utf-8');
const lines = code.split('\n');
const slices = [88, 93, 104, 114, 127, 133, 158, 224, 257, 277, 295, 350];

for (const i of slices) {
  const test = `
import React, { useState, useEffect } from 'react';
import { View, Alert } from 'react-native';
export const SettingsScreen = () => {
${lines.slice(28, i).join('\n')}
};
`;
  fs.writeFileSync('D:/NexPortal/NDeskBrowser/test_bin3.jsx', test);
  try {
    execSync('npx eslint D:/NexPortal/NDeskBrowser/test_bin3.jsx', { stdio: 'ignore' });
    console.log(`Lines 29 to ${i} PASSED`);
  } catch (e) {
    console.log(`Lines 29 to ${i} FAILED`);
  }
}
