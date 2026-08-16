import React from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { TrackerBlocker } from '../services/TrackerBlocker';

const getAutofillInjectionScript = () => {
  return `
    (function() {
      function findParentForm(element) {
        let parent = element.parentElement;
        while (parent && parent.tagName !== 'FORM') {
          parent = parent.parentElement;
        }
        return parent;
      }

      function setupListeners() {
        const passwordFields = document.querySelectorAll('input[type="password"]');
        passwordFields.forEach(field => {
          if (field.dataset.ndeskObserved) return;
          field.dataset.ndeskObserved = "true";

          const form = findParentForm(field) || document;
          const textFields = form.querySelectorAll('input[type="text"], input[type="email"]');
          let usernameField = null;
          textFields.forEach(tf => {
            if (tf !== field && (tf.name.includes('user') || tf.name.includes('email') || tf.type === 'email' || tf.id.includes('user') || tf.id.includes('email'))) {
              usernameField = tf;
            }
          });
          if (!usernameField && textFields.length > 0) {
            usernameField = textFields[0];
          }

          const formEl = findParentForm(field);
          if (formEl) {
            formEl.addEventListener('submit', function() {
              const usernameVal = usernameField ? usernameField.value : '';
              const passwordVal = field.value;
              if (usernameVal && passwordVal) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'NDESK_SAVE_CREDENTIALS',
                  username: usernameVal,
                  password: passwordVal,
                  domain: window.location.hostname
                }));
              }
            });
          }

          if (usernameField) {
            usernameField.addEventListener('focus', function() {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'NDESK_FOCUS_USERNAME',
                domain: window.location.hostname
              }));
            });
          }
        });
      }

      setupListeners();

      // Replace setInterval with MutationObserver for better performance and battery life
      const observer = new MutationObserver((mutations) => {
        let shouldSetup = false;
        for (const m of mutations) {
          if (m.addedNodes.length > 0) {
            shouldSetup = true;
            break;
          }
        }
        if (shouldSetup) setupListeners();
      });
      
      observer.observe(document.body, { childList: true, subtree: true });
    })();
  `;
};

const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export const BrowserView = ({
  url,
  webViewRef,
  onNavigationStateChange,
  onLoadProgress,
  onLoadStart,
  onLoadEnd,
  privacySettings,
  onBlockedTracker,
  onMessage,
  isDesktopMode = false,
  zoomScale = 100,
}) => {
  const getDesktopViewportScript = () => `
    (function() {
      let viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content', 'width=1280, initial-scale=${zoomScale / 100}, minimum-scale=0.1, maximum-scale=10.0, user-scalable=yes');
      } else {
        const meta = document.createElement('meta');
        meta.name = 'viewport';
        meta.content = 'width=1280, initial-scale=${zoomScale / 100}, minimum-scale=0.1, maximum-scale=10.0, user-scalable=yes';
        document.getElementsByTagName('head')[0].appendChild(meta);
      }
      document.body.style.zoom = "${zoomScale / 100}";
    })();
  `;

  const injectedJavaScript = React.useMemo(() => `
    ${privacySettings?.adBlockEnabled ? TrackerBlocker.getAntiTrackingScript() : ''}
    ${getAutofillInjectionScript()}
    ${isDesktopMode ? getDesktopViewportScript() : ''}
    true;
  `, [privacySettings?.adBlockEnabled, isDesktopMode, zoomScale]);

  // Memoize source to prevent reload loops when internal state changes but URL is identical
  const source = React.useMemo(() => ({ uri: url }), [url]);

  const handleShouldStartLoad = (request) => {
    if (privacySettings?.adBlockEnabled && TrackerBlocker.shouldBlockRequest(request.url)) {
      onBlockedTracker && onBlockedTracker(request.url);
      return false;
    }
    return true;
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={source}
        onNavigationStateChange={onNavigationStateChange}
        onLoadProgress={(e) => onLoadProgress(e.nativeEvent.progress)}
        onLoadStart={onLoadStart}
        onLoadEnd={onLoadEnd}
        injectedJavaScript={injectedJavaScript}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        onMessage={onMessage}
        style={styles.webview}
        userAgent={isDesktopMode ? DESKTOP_UA : (privacySettings?.customUserAgent || undefined)}
        thirdPartyCookiesEnabled={privacySettings?.cookiePolicy === 'all'}
        sharedCookiesEnabled={true}
        domStorageEnabled={true}
        javaScriptEnabled={true}
        javaScriptCanOpenWindowsAutomatically={true}
        geolocationEnabled={false}
        incognito={privacySettings?.incognitoMode}
        onFileDownload={({ nativeEvent }) => {
          onMessage({
            nativeEvent: {
              data: JSON.stringify({
                type: 'DOWNLOAD_REQUEST',
                url: nativeEvent.downloadUrl,
              })
            }
          });
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
  },
});

