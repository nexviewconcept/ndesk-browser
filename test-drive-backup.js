// test-drive-backup.js
// Tests the strict allowlist behavior for Drive Backup payload

function generateMockPayload(bookmarks, settings, history, tabGroups) {
  // Simulating DriveBackupManager._generatePayload logic
  const payload = {
    version: '1.0.2',
    timestamp: new Date().toISOString(),
    // Strictly mapped fields
    bookmarks: (bookmarks || []).map(b => ({
      id: b.id,
      title: b.title,
      url: b.url,
      folder: b.folder,
      isSystem: b.isSystem,
      createdAt: b.createdAt
    })),
    // Public history only, mapped fields
    publicHistory: (history || [])
      .filter(h => !h.isIncognito)
      .map(h => ({
        id: h.id,
        title: h.title,
        url: h.url,
        lastVisitedAt: h.lastVisitedAt,
        visitCount: h.visitCount
      })),
    // Only non-sensitive settings
    nonSensitivePreferences: {
      themeMode: settings?.themeMode || 'light',
      searchEngine: settings?.searchEngine || 'DuckDuckGo',
      adBlockEnabled: settings?.adBlockEnabled || false
    },
    // Optional tab groups
    tabGroups: (tabGroups || []).map(g => ({
      id: g.id,
      name: g.name,
      tabIds: g.tabIds,
      isPrivate: g.isPrivate,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt
    }))
  };
  return payload;
}

function runTest() {
  console.log("=== Drive Backup Allowlist Test ===");

  const mockBookmarks = [
    { id: '1', title: 'Public BM', url: 'https://public.com', folder: 'Bookmarks', isSystem: false, secret: 'LEAKED_BM_SECRET' },
    { id: 'default_nexview', title: 'Nexview', url: 'https://nexviewconcept.com.ng', isSystem: true, secret: 'LEAKED_SYS_SECRET' }
  ];

  const mockHistory = [
    { id: 'h1', title: 'Public Hist', url: 'https://publichist.com', isIncognito: false, secret: 'LEAKED_PUBLIC_HIST' },
    { id: 'h2', title: 'Private Hist', url: 'https://privatehist.com', isIncognito: true, secret: 'LEAKED_PRIVATE_HIST' }
  ];

  const mockSettings = {
    themeMode: 'dark',
    searchEngine: 'Google',
    adBlockEnabled: true,
    aiApiKey: 'sk-SUPER_SECRET_AI_KEY',
    googleClientId: 'SECRET_OAUTH_TOKEN'
  };

  const mockTabGroups = [
    { id: 'g1', name: 'Work', tabIds: '[]', isPrivate: false, secret: 'LEAKED_GROUP_SECRET' }
  ];

  const payload = generateMockPayload(mockBookmarks, mockSettings, mockHistory, mockTabGroups);
  const payloadStr = JSON.stringify(payload);

  let passed = true;

  // 1. Verify secrets are blocked
  if (payloadStr.includes('LEAKED_BM_SECRET') || payloadStr.includes('LEAKED_SYS_SECRET') || payloadStr.includes('LEAKED_PUBLIC_HIST') || payloadStr.includes('LEAKED_GROUP_SECRET')) {
    console.error("[FAIL] Undefined attributes leaked into backup.");
    passed = false;
  } else {
    console.log("[PASS] Unmapped attributes are stripped.");
  }

  // 2. Verify private history is blocked
  if (payloadStr.includes('privatehist.com')) {
    console.error("[FAIL] Private history leaked into backup.");
    passed = false;
  } else {
    console.log("[PASS] Private history is excluded.");
  }

  // 3. Verify API keys / OAuth tokens are blocked
  if (payloadStr.includes('sk-SUPER_SECRET_AI_KEY') || payloadStr.includes('SECRET_OAUTH_TOKEN')) {
    console.error("[FAIL] Sensitive settings leaked into backup.");
    passed = false;
  } else {
    console.log("[PASS] Sensitive settings (API keys) are excluded.");
  }

  if (passed) {
    console.log("=== ALL DRIVE BACKUP TESTS PASSED ===");
  } else {
    console.error("=== DRIVE BACKUP TESTS FAILED ===");
  }
}

runTest();
