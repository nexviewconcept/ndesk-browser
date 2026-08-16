const fs = require('fs');
const babel = require('@babel/core');
try {
  babel.parse(fs.readFileSync('src/screens/SettingsScreen.jsx', 'utf-8'), {
    presets: ['@babel/preset-react'],
    filename: 'SettingsScreen.jsx'
  });
  console.log('OK');
} catch (err) {
  console.error('Error at line:', err.loc?.line, 'col:', err.loc?.column, err.message);
}
