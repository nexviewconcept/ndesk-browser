const fs = require('fs');
const code = fs.readFileSync('D:/NexPortal/NDeskBrowser/src/screens/SettingsScreen.jsx', 'utf-8');
const lines = code.split('\n');

const test = `
import React, { useState, useEffect } from 'react';
import { View, Alert } from 'react-native';
${lines.slice(27, 350).join('\n')}
  return null;
};
`;
fs.writeFileSync('D:/NexPortal/NDeskBrowser/test_logic.jsx', test);
