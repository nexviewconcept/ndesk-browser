const fs = require('fs');
const code = fs.readFileSync('D:/NexPortal/NDeskBrowser/src/screens/SettingsScreen.jsx', 'utf-8');
const lines = code.split('\n');

const test1 = `
import React from 'react';
export const SettingsScreen = () => {
${lines.slice(28, 150).join('\n')}
};
`;
fs.writeFileSync('D:/NexPortal/NDeskBrowser/test_logic_1.jsx', test1);

const test2 = `
import React from 'react';
export const SettingsScreen = () => {
${lines.slice(28, 250).join('\n')}
};
`;
fs.writeFileSync('D:/NexPortal/NDeskBrowser/test_logic_2.jsx', test2);
