const fs = require('fs');
const code = fs.readFileSync('D:/NexPortal/NDeskBrowser/src/screens/SettingsScreen.jsx', 'utf-8');
const lines = code.split('\n');

const test = `
import React from 'react';
import { View, ScrollView } from 'react-native';
export const SettingsScreen = ({ navigation }) => {
${lines.slice(350, 782).join('\n')}
};
`;
fs.writeFileSync('D:/NexPortal/NDeskBrowser/test_clean.jsx', test);
