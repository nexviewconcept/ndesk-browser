const fs = require('fs');
const code = fs.readFileSync('D:/NexPortal/NDeskBrowser/src/screens/SettingsScreen.jsx', 'utf-8');
const lines = code.split('\n');
const prefix = lines.slice(0, 300).join('\n');
const suffix = '\n      </ScrollView>\n    </View>\n  );\n};\n' + lines.slice(784).join('\n');
fs.writeFileSync('test2.jsx', prefix + suffix);
