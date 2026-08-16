const fs = require('fs');
const code = fs.readFileSync('D:/NexPortal/NDeskBrowser/src/screens/SettingsScreen.jsx', 'utf-8');
const lines = code.split('\n');

const test3 = `
${lines.slice(0, 508).join('\n')}
      </ScrollView>
    </View>
  );
};
${lines.slice(784).join('\n')}
`;
fs.writeFileSync('D:/NexPortal/NDeskBrowser/test_compile3.jsx', test3);

const test4 = `
${lines.slice(0, 589).join('\n')}
      </ScrollView>
    </View>
  );
};
${lines.slice(784).join('\n')}
`;
fs.writeFileSync('D:/NexPortal/NDeskBrowser/test_compile4.jsx', test4);
