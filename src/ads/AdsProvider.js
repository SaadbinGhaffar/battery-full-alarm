/**
 * Runs Google's User Messaging Platform (UMP) consent flow, then initializes the
 * Mobile Ads SDK. Ads must not be requested until `canRequestAds` is true —
 * required for EEA/UK users under Google's EU User Consent Policy.
 *
 * Exposes:
 *  - ready: SDK initialized and consent allows ad requests
 *  - privacyOptionsRequired: the user must be offered a way to change consent
 *  - showPrivacyOptions(): opens Google's privacy options form
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { ADS_ENABLED, GoogleAds } from './googleAds';

const AdsContext = createContext({
  ready: false,
  privacyOptionsRequired: false,
  showPrivacyOptions: async () => {},
});

function isPrivacyRequired(info) {
  return (
    info?.privacyOptionsRequirementStatus ===
    GoogleAds.AdsConsentPrivacyOptionsRequirementStatus.REQUIRED
  );
}

export function AdsProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [privacyOptionsRequired, setPrivacyOptionsRequired] = useState(false);

  useEffect(() => {
    if (!ADS_ENABLED) return undefined;
    let cancelled = false;

    (async () => {
      const { AdsConsent, default: mobileAds } = GoogleAds;
      let canRequestAds = false;

      try {
        // Refreshes consent info and shows the consent form if one is required.
        const info = await AdsConsent.gatherConsent();
        canRequestAds = info.canRequestAds;
        if (!cancelled) setPrivacyOptionsRequired(isPrivacyRequired(info));
      } catch {
        // e.g. offline: fall back to consent obtained in a previous session.
        try {
          canRequestAds = (await AdsConsent.getConsentInfo()).canRequestAds;
        } catch {
          canRequestAds = false;
        }
      }

      if (cancelled || !canRequestAds) return;
      try {
        await mobileAds().initialize();
        if (!cancelled) setReady(true);
      } catch {
        // SDK failed to start — the app keeps working without ads.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const showPrivacyOptions = useCallback(async () => {
    if (!ADS_ENABLED) return;
    try {
      const info = await GoogleAds.AdsConsent.showPrivacyOptionsForm();
      setPrivacyOptionsRequired(isPrivacyRequired(info));
      // If consent was withdrawn, stop requesting new ads.
      if (!info.canRequestAds) setReady(false);
    } catch {
      // form unavailable — nothing to do
    }
  }, []);

  const value = useMemo(
    () => ({ ready, privacyOptionsRequired, showPrivacyOptions }),
    [ready, privacyOptionsRequired, showPrivacyOptions]
  );

  return <AdsContext.Provider value={value}>{children}</AdsContext.Provider>;
}

export function useAds() {
  return useContext(AdsContext);
}
