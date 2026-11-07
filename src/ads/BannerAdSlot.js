/**
 * Full-width anchored adaptive banner, framed to match the retro UI.
 * Renders nothing until an ad has actually loaded (no empty box on no-fill,
 * offline, missing consent, or in Expo Go).
 */
import React, { useEffect, useRef, useState } from 'react';
import { AppState, Platform, StyleSheet, Text, View } from 'react-native';

import { colors, type } from '../theme';
import { AD_KEYWORDS } from './adConfig';
import { GoogleAds, getAdUnitId } from './googleAds';
import { useAds } from './AdsProvider';

const UNIT_ID = getAdUnitId('banner');
const REQUEST_OPTIONS = { keywords: AD_KEYWORDS };

export default function BannerAdSlot() {
  const { ready } = useAds();
  const [loaded, setLoaded] = useState(false);
  const bannerRef = useRef(null);

  // iOS can blank a banner's web view after backgrounding; reload on return.
  useEffect(() => {
    if (Platform.OS !== 'ios') return undefined;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') bannerRef.current?.load();
    });
    return () => sub.remove();
  }, []);

  if (!ready || !UNIT_ID) return null;
  const { BannerAd, BannerAdSize } = GoogleAds;

  return (
    <View style={loaded ? styles.frame : styles.hidden}>
      {loaded && <Text style={styles.label}>ADVERTISEMENT</Text>}
      <BannerAd
        ref={bannerRef}
        unitId={UNIT_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={REQUEST_OPTIONS}
        onAdLoaded={() => setLoaded(true)}
        // No failure handler: if the first load fails the slot stays hidden; if a
        // later refresh fails, AdMob keeps showing the previous ad, so we do too.
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    backgroundColor: colors.scrim,
    borderTopWidth: 2,
    borderTopColor: colors.orange,
    paddingTop: 3,
  },
  // Keep the banner mounted (so it can load) but take up no space until it does.
  hidden: { height: 0, overflow: 'hidden' },
  label: { ...type.pixelXs, color: colors.muted, marginBottom: 3 },
});
