const fs = require('fs');
const code = fs.readFileSync('D:/NexPortal/NDeskBrowser/src/screens/SettingsScreen.jsx', 'utf-8');
const lines = code.split('\n');

const test = `
${lines.slice(0, 600).join('\n')}
      </ScrollView>
    </View>
  );
};
${lines.slice(784).join('\n')}
`;
fs.writeFileSync('D:/NexPortal/NDeskBrowser/test_compile.jsx', test);
