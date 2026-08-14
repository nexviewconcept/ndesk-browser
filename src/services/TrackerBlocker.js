// A curated list of popular analytics, advertising, tracking, and telemetry domains.
const TRACKER_DOMAINS = [
  'doubleclick.net',
  'google-analytics.com',
  'googletagmanager.com',
  'googletagservices.com',
  'googleadservices.com',
  'googlesyndication.com',
  'analytics.google.com',
  'adservice.google',
  'pagead2.googlesyndication.com',
  'facebook.net',
  'facebook.com/tr',
  'connect.facebook.net',
  'adnxs.com',
  'adsrvr.org',
  'amazon-adsystem.com',
  'criteo.com',
  'pubmatic.com',
  'rubiconproject.com',
  'casalemedia.com',
  'openx.net',
  'outbrain.com',
  'taboola.com',
  'scorecardresearch.com',
  'quantserve.com',
  'hotjar.com',
  'mixpanel.com',
  'amplitude.com',
  'segment.io',
  'segment.com',
  'optimizely.com',
  'crazyegg.com',
  'clicktale.net',
  'statcounter.com',
  'adobedtm.com',
  'omtrdc.net',
  'chartbeat.net',
  'luckyorange.com',
  'app-measurement.com',
  'firebase-settings.crashlytics.com',
  'crashlytics.com',
  'adjust.com',
  'appsflyer.com',
  'branch.io',
  'onesignal.com',
  'flurry.com',
  'ads.youtube.com',
  'ad.doubleclick.net',
  'analytics.twitter.com',
  'ads-api.twitter.com',
  'pixel.wp.com',
  'stats.wp.com',
  'disqus.com',
  'carbonads.net',
  'buyautos.com',
  'adcolony.com',
  'unityads.unity3d.com',
  'vungle.com',
  'applovin.com'
];

export const TrackerBlocker = {
  /**
   * Evaluates if a request URL matches any tracker domain.
   */
  shouldBlockRequest(url) {
    if (!url) return false;
    try {
      const lowerUrl = url.toLowerCase();
      // Ignore main page navigations (e.g. if the user explicitly goes to a search result)
      // We block trackers loaded inside pages
      return TRACKER_DOMAINS.some(domain => lowerUrl.includes(domain));
    } catch {
      return false;
    }
  },

  /**
   * Generates a JavaScript script to run on page load to block tracker scripts
   * and hide standard advertisement slots.
   */
  getAntiTrackingScript() {
    return `
      (function() {
        // Prevent telemetry tracking
        window.ga = window.ga || function() {};
        window.mixpanel = window.mixpanel || { init: function() {}, track: function() {}, identify: function() {}, people: { set: function() {} } };
        window.fbq = window.fbq || function() {};
        
        // Inline helper to hide known ads elements
        const adSelectors = [
          'iframe[src*="doubleclick"]',
          'iframe[src*="googleads"]',
          'div[class*="ad-unit"]',
          'div[class*="sponsored-post"]',
          'div[id*="google_ads"]',
          'div[class*="ad-box"]',
          'amp-ad'
        ];
        
        function cleanAds() {
          adSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
              el.remove(); // Remove element from DOM
            });
          });
        }
        
        // Clean once DOM loads and repeat periodically to handle dynamic script inserts
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', cleanAds);
        } else {
          cleanAds();
        }
        setInterval(cleanAds, 1500);
      })();
    `;
  }
};
