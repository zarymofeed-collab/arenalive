import { useState, useEffect } from 'react';
import { START_IO_CONFIG } from '../config/startIoConfig';

// Extend window object for Start.io SDK
declare global {
  interface Window {
    startApp?: any;
    StartApp?: any;
    startioAdCallbackLoaded?: boolean;
  }
}

// Global script loading state variables
let isScriptLoading = false;
let isScriptLoaded = false;
let scriptLoadError: Error | null = null;
const loadCallbacks: Array<(err: Error | null) => void> = [];

// Global active/visible ads tracker
let activeAdsOnScreen = 0;
const activeAdListeners: Set<(count: number) => void> = new Set();

/**
 * Loads the Start.io SDK dynamically.
 * Resolves when loaded, rejects if failed.
 */
export const loadStartIoSdk = (): Promise<void> => {
  if (isScriptLoaded) return Promise.resolve();
  if (scriptLoadError) return Promise.reject(scriptLoadError);

  return new Promise((resolve, reject) => {
    // Add callback to list
    loadCallbacks.push((err) => {
      if (err) reject(err);
      else resolve();
    });

    if (isScriptLoading) return;
    isScriptLoading = true;

    // Check if script already exists in document
    const existingScript = document.querySelector(`script[src="${START_IO_CONFIG.sdkUrl}"]`);
    if (existingScript) {
      isScriptLoaded = true;
      isScriptLoading = false;
      loadCallbacks.forEach((cb) => cb(null));
      loadCallbacks.length = 0;
      return;
    }

    const script = document.createElement('script');
    script.src = START_IO_CONFIG.sdkUrl;
    script.type = 'text/javascript';
    script.async = true;
    
    // Add standard custom attributes required by Start.io if any
    script.setAttribute('data-publisher-id', START_IO_CONFIG.siteId);

    script.onload = () => {
      isScriptLoaded = true;
      isScriptLoading = false;
      
      // Initialize StartApp global object if it exists and needs initialization
      if (window.startApp && typeof window.startApp.init === 'function') {
        try {
          window.startApp.init({ publisherId: START_IO_CONFIG.siteId });
        } catch (e) {
          console.warn('StartApp auto-init failed, will initialize per-slot:', e);
        }
      }

      loadCallbacks.forEach((cb) => cb(null));
      loadCallbacks.length = 0;
    };

    script.onerror = (e) => {
      isScriptLoading = false;
      const errorObj = new Error('Failed to load Start.io script.');
      scriptLoadError = errorObj;
      loadCallbacks.forEach((cb) => cb(errorObj));
      loadCallbacks.length = 0;
    };

    document.head.appendChild(script);
  });
};

/**
 * React hook to manage Start.io SDK state, load status, and on-screen ad limiting.
 */
export const useStartIo = () => {
  const [loaded, setLoaded] = useState(isScriptLoaded);
  const [error, setError] = useState<string | null>(scriptLoadError ? scriptLoadError.message : null);
  const [activeAdsCount, setActiveAdsCount] = useState(activeAdsOnScreen);

  useEffect(() => {
    let active = true;

    // Register active ads count change listener
    const handleCountChange = (count: number) => {
      if (active) {
        setActiveAdsCount(count);
      }
    };
    activeAdListeners.add(handleCountChange);

    if (isScriptLoaded) {
      setLoaded(true);
    } else {
      loadStartIoSdk()
        .then(() => {
          if (active) setLoaded(true);
        })
        .catch((err) => {
          if (active) setError(err.message || 'Error loading Start.io Web Ads SDK');
        });
    }

    return () => {
      active = false;
      activeAdListeners.delete(handleCountChange);
    };
  }, []);

  /**
   * Register that an ad has entered the screen viewport
   */
  const registerVisibleAd = () => {
    activeAdsOnScreen++;
    activeAdListeners.forEach((listener) => listener(activeAdsOnScreen));
  };

  /**
   * Unregister when an ad exits the screen viewport or unmounts
   */
  const unregisterVisibleAd = () => {
    activeAdsOnScreen = Math.max(0, activeAdsOnScreen - 1);
    activeAdListeners.forEach((listener) => listener(activeAdsOnScreen));
  };

  /**
   * Check if we are allowed to show more ads (max limit guard)
   */
  const isAdDisplayAllowed = () => {
    return activeAdsOnScreen < START_IO_CONFIG.maxVisibleAds;
  };

  return {
    loaded,
    error,
    activeAdsCount,
    registerVisibleAd,
    unregisterVisibleAd,
    isAdDisplayAllowed,
    siteId: START_IO_CONFIG.siteId
  };
};
