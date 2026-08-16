import React from "react";
export const Test = () => {
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.background, paddingTop: insets.top },
      ]}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Settings
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Section 1: Appearance */}
        <Text style={styles.sectionHeader}>APPEARANCE</Text>
        <View
          style={[
            styles.sectionGroup,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View style={styles.settingItem}>
            <View>
              <Text style={[styles.settingLabel, { color: theme.text }]}>
                Theme Mode
              </Text>
              <Text
                style={[styles.settingDesc, { color: theme.textSecondary }]}
              >
                Change the appearance of the browser
              </Text>
            </View>
            <View style={styles.segmentedButtons}>
              {["light", "dark", "system"].map((mode) => (
                <TouchableOpacity
                  key={mode}
                  onPress={() => setThemeMode(mode)}
                  style={[
                    styles.segBtn,
                    themeMode === mode && [
                      styles.segBtnActive,
                      { backgroundColor: theme.accent },
                    ],
                  ]}
                >
                  <Text
                    style={[
                      styles.segBtnText,
                      {
                        color:
                          themeMode === mode ? "#FFF" : theme.textSecondary,
                      },
                    ]}
                  >
                    {mode.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Section 2: Privacy & AdBlocker */}
        <Text style={styles.sectionHeader}>PRIVACY & SECURITY</Text>
        <View
          style={[
            styles.sectionGroup,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View style={styles.settingItem}>
            <View style={styles.labelWrapper}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>
                Block Ads & Trackers
              </Text>
              <Text
                style={[styles.settingDesc, { color: theme.textSecondary }]}
              >
                Block tracking networks and popups
              </Text>
            </View>
            <Switch
              value={privacySettings.adBlockEnabled}
              onValueChange={(val) =>
                handleUpdatePrivacy("adBlockEnabled", val)
              }
              trackColor={{ false: theme.border, true: theme.accent }}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.settingItem}>
            <View style={styles.labelWrapper}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>
                Search Engine
              </Text>
            </View>
            <View style={styles.segmentedButtons}>
              {["DuckDuckGo", "Google", "Bing"].map((engine) => (
                <TouchableOpacity
                  key={engine}
                  onPress={() => handleUpdatePrivacy("searchEngine", engine)}
                  style={[
                    styles.segBtn,
                    privacySettings.searchEngine === engine && [
                      styles.segBtnActive,
                      { backgroundColor: theme.accent },
                    ],
                  ]}
                >
                  <Text
                    style={[
                      styles.segBtnText,
                      {
                        color:
                          privacySettings.searchEngine === engine
                            ? "#FFF"
                            : theme.textSecondary,
                      },
                    ]}
                  >
                    {engine === "DuckDuckGo" ? "DDG" : engine}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Section 3: AI Settings */}
        <Text style={styles.sectionHeader}>AI ASSISTANT</Text>
        <View
          style={[
            styles.sectionGroup,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View style={styles.settingItem}>
            <View style={styles.labelWrapper}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>
                AI Provider
              </Text>
              <Text
                style={[styles.settingDesc, { color: theme.textSecondary }]}
              >
                Your key is saved per-provider on this device
              </Text>
            </View>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: 16,
              gap: 8,
            }}
          >
            {Object.keys(ProviderRegistry).map((provider) => (
              <TouchableOpacity
                key={provider}
                onPress={() => handleChangeAiProvider(provider)}
                style={[
                  styles.segBtn,
                  privacySettings.aiProvider === provider && [
                    styles.segBtnActive,
                    { backgroundColor: theme.accent },
                  ],
                ]}
              >
                <Text
                  style={[
                    styles.segBtnText,
                    {
                      color:
                        privacySettings.aiProvider === provider
                          ? "#FFF"
                          : theme.textSecondary,
                    },
                  ]}
                >
                  {ProviderRegistry[provider].name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.apiInputContainer}>
            <Text style={[styles.apiInputLabel, { color: theme.text }]}>
              {ProviderRegistry[privacySettings.aiProvider || "HuggingFace"]
                ?.name || "AI"}{" "}
              API Key
            </Text>
            <TextInput
              placeholder="Paste your personal API key here..."
              placeholderTextColor={theme.textSecondary}
              secureTextEntry
              value={userAiKey}
              onChangeText={setUserAiKey}
              onBlur={() => handleSaveAiKey(userAiKey)}
              onSubmitEditing={() => handleSaveAiKey(userAiKey)}
              style={[
                styles.apiInput,
                {
                  backgroundColor: theme.surfaceSecondary,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
            />
            <Text
              style={[
                styles.apiHelpText,
                { color: theme.textSecondary, marginTop: 8 },
              ]}
            >
              {
                ProviderRegistry[privacySettings.aiProvider || "HuggingFace"]
                  ?.name
              }{" "}
              requires an API key to process content. Key is stored securely on
              your device.
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={{ padding: 16 }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: "bold",
                color: theme.text,
                marginBottom: 4,
              }}
            >
              PRIVACY DISCLOSURE
            </Text>
            <Text
              style={{
                fontSize: 11,
                color: theme.textSecondary,
                lineHeight: 16,
              }}
            >
              When you ask AI to summarize or explain a page, the page's text
              content is sent to{" "}
              {
                ProviderRegistry[privacySettings.aiProvider || "HuggingFace"]
                  ?.endpoint
              }
              .{"\n"}NDesk does not collect this data, but the provider might.
              {"\n\n"}Please review their policies:
              {"\n"}• Privacy:{" "}
              {
                ProviderRegistry[privacySettings.aiProvider || "HuggingFace"]
                  ?.privacyUrl
              }
              {"\n"}• Terms:{" "}
              {
                ProviderRegistry[privacySettings.aiProvider || "HuggingFace"]
                  ?.termsUrl
              }
            </Text>
          </View>
        </View>

        {/* Section 4: Google Drive Sync */}
        <Text style={styles.sectionHeader}>GOOGLE DRIVE CLOUD SYNC</Text>
        <View
          style={[
            styles.sectionGroup,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          {authData ? (
            <View style={styles.profileWrapper}>
              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: theme.text }]}>
                  {authData.user.name}
                </Text>
                <Text
                  style={[styles.profileEmail, { color: theme.textSecondary }]}
                >
                  {authData.user.email}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleGoogleSignOut}
                style={[styles.signOutBtn, { borderColor: theme.error }]}
              >
                <Text style={[styles.signOutText, { color: theme.error }]}>
                  Sign Out
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.loginWrapper}>
              <Text style={[styles.loginHelp, { color: theme.textSecondary }]}>
                Backup and sync bookmarks, history, and settings safely to your
                personal Google Drive storage. Sign in to select your Google
                account.
              </Text>
              <TextInput
                placeholder="Google Web Client ID (Optional)"
                placeholderTextColor={theme.textSecondary}
                value={googleClientId}
                onChangeText={setGoogleClientId}
                onBlur={() =>
                  handleUpdatePrivacy("googleClientId", googleClientId)
                }
                onSubmitEditing={() =>
                  handleUpdatePrivacy("googleClientId", googleClientId)
                }
                style={[
                  styles.apiInput,
                  {
                    backgroundColor: theme.surfaceSecondary,
                    color: theme.text,
                    borderColor: theme.border,
                    marginBottom: 12,
                  },
                ]}
              />
              <TouchableOpacity
                onPress={handleGoogleSignIn}
                style={[styles.signInBtn, { backgroundColor: theme.accent }]}
              >
                <Ionicons
                  name="logo-google"
                  size={18}
                  color="#FFF"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.signInText}>Sign In with Google</Text>
              </TouchableOpacity>
            </View>
          )}

          {authData && (
            <>
              <View
                style={[styles.divider, { backgroundColor: theme.border }]}
              />
              <View style={styles.syncActions}>
                <TouchableOpacity
                  disabled={isSyncing}
                  onPress={handleSyncBackup}
                  style={[styles.syncBtn, { backgroundColor: theme.accent }]}
                >
                  {isSyncing ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Ionicons
                        name="cloud-upload-outline"
                        size={18}
                        color="#FFF"
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.syncBtnText}>Backup</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  disabled={isSyncing}
                  onPress={handleRestoreBackup}
                  style={[
                    styles.syncBtn,
                    {
                      backgroundColor: theme.surfaceSecondary,
                      borderWidth: 1,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="cloud-download-outline"
                    size={18}
                    color={theme.text}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.syncBtnText, { color: theme.text }]}>
                    Restore
                  </Text>
                </TouchableOpacity>
              </View>
              {lastSyncTime && (
                <Text style={[styles.syncTime, { color: theme.textSecondary }]}>
                  Last Sync: {new Date(lastSyncTime).toLocaleString()}
                </Text>
              )}
            </>
          )}

          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <TouchableOpacity
            onPress={handleImportBookmarks}
            style={[styles.settingItem, { paddingTop: 16 }]}
          >
            <View style={styles.labelWrapper}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>
                Import Bookmarks (HTML)
              </Text>
              <Text
                style={[styles.settingDesc, { color: theme.textSecondary }]}
              >
                Import bookmarks from Chrome, Firefox, Safari
              </Text>
            </View>
            <Ionicons
              name="document-text-outline"
              size={18}
              color={theme.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Section: Clear Data */}
        <Text style={styles.sectionHeader}>CLEAR BROWSING DATA</Text>
        <View
          style={[
            styles.sectionGroup,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <TouchableOpacity
            onPress={() => handleClearData("history")}
            style={styles.settingItem}
          >
            <View style={styles.labelWrapper}>
              <Text
                style={[
                  styles.settingLabel,
                  { color: theme.error || "#EF4444" },
                ]}
              >
                Clear Browsing History
              </Text>
              <Text
                style={[styles.settingDesc, { color: theme.textSecondary }]}
              >
                Remove list of visited websites
              </Text>
            </View>
            <Ionicons
              name="trash-outline"
              size={18}
              color={theme.error || "#EF4444"}
            />
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <TouchableOpacity
            onPress={() => handleClearData("cache_cookies")}
            style={styles.settingItem}
          >
            <View style={styles.labelWrapper}>
              <Text
                style={[
                  styles.settingLabel,
                  { color: theme.error || "#EF4444" },
                ]}
              >
                Clear Cache & Cookies
              </Text>
              <Text
                style={[styles.settingDesc, { color: theme.textSecondary }]}
              >
                Sign out of sites and free up space
              </Text>
            </View>
            <Ionicons
              name="trash-outline"
              size={18}
              color={theme.error || "#EF4444"}
            />
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <TouchableOpacity
            onPress={() => handleClearData("passwords")}
            style={styles.settingItem}
          >
            <View style={styles.labelWrapper}>
              <Text
                style={[
                  styles.settingLabel,
                  { color: theme.error || "#EF4444" },
                ]}
              >
                Clear Saved Passwords
              </Text>
              <Text
                style={[styles.settingDesc, { color: theme.textSecondary }]}
              >
                Remove all auto-fill credentials
              </Text>
            </View>
            <Ionicons
              name="trash-outline"
              size={18}
              color={theme.error || "#EF4444"}
            />
          </TouchableOpacity>
        </View>

        {/* Section 6: About & Help */}
        <Text style={styles.sectionHeader}>ABOUT & HELP</Text>
        <View
          style={[
            styles.sectionGroup,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <TouchableOpacity
            onPress={() => navigation.navigate("Privacy")}
            style={styles.settingItem}
          >
            <View style={styles.labelWrapper}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>
                Privacy Center
              </Text>
              <Text
                style={[styles.settingDesc, { color: theme.textSecondary }]}
              >
                What we collect and how we protect you
              </Text>
            </View>
            <Ionicons
              name="shield-checkmark-outline"
              size={18}
              color={theme.textSecondary}
            />
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <TouchableOpacity
            onPress={() => navigation.navigate("Feedback")}
            style={styles.settingItem}
          >
            <View style={styles.labelWrapper}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>
                Send Feedback
              </Text>
              <Text
                style={[styles.settingDesc, { color: theme.textSecondary }]}
              >
                Report bugs or suggest features
              </Text>
            </View>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={18}
              color={theme.textSecondary}
            />
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <TouchableOpacity
            onPress={() => {
              // Usually opens browser internally or externally
            }}
            style={styles.settingItem}
          >
            <View style={styles.labelWrapper}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>
                Developed by Nexview Concept Limited
              </Text>
              <Text style={[styles.settingDesc, { color: theme.accent }]}>
                nexviewconcept.com.ng
              </Text>
            </View>
            <Ionicons name="open-outline" size={18} color={theme.accent} />
          </TouchableOpacity>
        </View>

        {/* Section 5: Autofill & Saved Passwords */}
        <Text style={styles.sectionHeader}>AUTOFILL & PASSWORDS</Text>
        <View
          style={[
            styles.sectionGroup,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <TouchableOpacity
            onPress={async () => {
              if (!showLogins) {
                try {
                  const hasHardware =
                    await LocalAuthentication.hasHardwareAsync();
                  const isEnrolled =
                    await LocalAuthentication.isEnrolledAsync();
                  if (hasHardware && isEnrolled) {
                    const result = await LocalAuthentication.authenticateAsync({
                      promptMessage: "Authenticate to view saved passwords",
                      fallbackLabel: "Use Device PIN",
                    });
                    if (result.success) {
                      setShowLogins(true);
                    } else {
                      Alert.alert(
                        "Authentication Failed",
                        "You must authenticate to view saved passwords.",
                      );
                    }
                  } else {
                    // No biometrics available, just show it
                    setShowLogins(true);
                  }
                } catch (e) {
                  setShowLogins(true);
                }
              } else {
                setShowLogins(false);
              }
            }}
            style={styles.settingItem}
          >
            <View style={styles.labelWrapper}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>
                Saved Passwords
              </Text>
              <Text
                style={[styles.settingDesc, { color: theme.textSecondary }]}
              >
                {savedLogins.length} credential
                {savedLogins.length !== 1 ? "s" : ""} saved
              </Text>
            </View>
            <Ionicons
              name={showLogins ? "chevron-up" : "chevron-down"}
              size={18}
              color={theme.textSecondary}
            />
          </TouchableOpacity>

          {showLogins && savedLogins.length > 0 && (
            <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
              {savedLogins.map((login, idx) => (
                <View
                  key={login.id || idx}
                  style={[styles.loginRow, { borderColor: theme.border }]}
                >
                  <Ionicons
                    name="key-outline"
                    size={16}
                    color={theme.accent}
                    style={{ marginRight: 8 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        { color: theme.text, fontSize: 13, fontWeight: "600" },
                      ]}
                    >
                      {login.domain}
                    </Text>
                    <Text
                      style={[{ color: theme.textSecondary, fontSize: 12 }]}
                    >
                      {login.username} • {login.password}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteLogin(login)}
                    style={{ padding: 4 }}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={16}
                      color={theme.error || "#EF4444"}
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {showLogins && savedLogins.length === 0 && (
            <View style={{ padding: 16, alignItems: "center" }}>
              <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                No saved passwords yet. Passwords are saved when you sign in to
                websites.
              </Text>
            </View>
          )}

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* Payment Cards */}
          <TouchableOpacity
            onPress={() => setShowCards(!showCards)}
            style={styles.settingItem}
          >
            <View style={styles.labelWrapper}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>
                Payment Methods
              </Text>
              <Text
                style={[styles.settingDesc, { color: theme.textSecondary }]}
              >
                {savedCards.length} card{savedCards.length !== 1 ? "s" : ""}{" "}
                saved
              </Text>
            </View>
            <Ionicons
              name={showCards ? "chevron-up" : "chevron-down"}
              size={18}
              color={theme.textSecondary}
            />
          </TouchableOpacity>

          {showCards && savedCards.length > 0 && (
            <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
              {savedCards.map((card, idx) => (
                <View
                  key={card.id || idx}
                  style={[styles.loginRow, { borderColor: theme.border }]}
                >
                  <Ionicons
                    name="card-outline"
                    size={16}
                    color={theme.accent}
                    style={{ marginRight: 8 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        { color: theme.text, fontSize: 13, fontWeight: "600" },
                      ]}
                    >
                      {card.maskedNumber || "•••• ****"}
                    </Text>
                    <Text
                      style={[{ color: theme.textSecondary, fontSize: 12 }]}
                    >
                      {card.cardHolder || "Card holder"}
                      {card.expiryDate ? ` • Exp: ${card.expiryDate}` : ""}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteCard(card)}
                    style={{ padding: 4 }}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={16}
                      color={theme.error || "#EF4444"}
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {showCards && savedCards.length === 0 && (
            <View style={{ padding: 16, alignItems: "center" }}>
              <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                No payment cards saved yet.
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};
