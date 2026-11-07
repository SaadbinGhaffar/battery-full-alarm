/**
 * Native Advanced ad rendered as a retro "SPONSORED" card.
 *
 * Built to AdMob native-ad policy:
 *  - clearly labeled with an "AD" badge (AdChoices is added by the SDK, top-right)
 *  - headline always shown; media view at least 120dp tall
 *  - every visible asset is registered via NativeAsset so taps are attributed
 *  - advertiser text is displayed as provided (no case or wording changes)
 *
 * Loads once per mount, destroys the ad on unmount, and renders nothing on
 * no-fill / errors.
 */
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, type } from '../theme';
import RetroPanel from '../components/retro/RetroPanel';
import { AD_KEYWORDS } from './adConfig';
import { GoogleAds, getAdUnitId } from './googleAds';
import { useAds } from './AdsProvider';

const UNIT_ID = getAdUnitId('native');
const MIN_MEDIA_HEIGHT = 120;

export default function NativeAdCard({ style }) {
  const { ready } = useAds();
  const [nativeAd, setNativeAd] = useState(null);

  useEffect(() => {
    if (!ready || !UNIT_ID) return undefined;
    let active = true;
    let loadedAd = null;

    GoogleAds.NativeAd.createForAdRequest(UNIT_ID, { keywords: AD_KEYWORDS })
      .then((ad) => {
        if (active) {
          loadedAd = ad;
          setNativeAd(ad);
        } else {
          ad.destroy();
        }
      })
      .catch(() => {
        // no fill / network error — the card simply doesn't render
      });

    return () => {
      active = false;
      loadedAd?.destroy();
    };
  }, [ready]);

  if (!nativeAd) return null;
  const { NativeAdView, NativeAsset, NativeAssetType, NativeMediaView } = GoogleAds;
  const aspectRatio = nativeAd.mediaContent?.aspectRatio || 16 / 9;

  return (
    <RetroPanel style={style} borderColor={colors.amber} contentStyle={styles.panel}>
      <NativeAdView nativeAd={nativeAd} style={styles.adView}>
        <View style={styles.topRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>AD</Text>
          </View>
          {!!nativeAd.advertiser && (
            <NativeAsset assetType={NativeAssetType.ADVERTISER}>
              <Text style={styles.advertiser} numberOfLines={1}>
                {nativeAd.advertiser}
              </Text>
            </NativeAsset>
          )}
        </View>

        <View style={styles.headerRow}>
          {!!nativeAd.icon?.url && (
            <NativeAsset assetType={NativeAssetType.ICON}>
              <Image source={{ uri: nativeAd.icon.url }} style={styles.icon} />
            </NativeAsset>
          )}
          <View style={styles.headerText}>
            <NativeAsset assetType={NativeAssetType.HEADLINE}>
              <Text style={styles.headline} numberOfLines={2}>
                {nativeAd.headline}
              </Text>
            </NativeAsset>
            {!!nativeAd.body && (
              <NativeAsset assetType={NativeAssetType.BODY}>
                <Text style={styles.body} numberOfLines={2}>
                  {nativeAd.body}
                </Text>
              </NativeAsset>
            )}
          </View>
        </View>

        <NativeMediaView style={[styles.media, { aspectRatio }]} resizeMode="cover" />

        {!!nativeAd.callToAction && (
          <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
            <Text style={styles.cta}>{nativeAd.callToAction}</Text>
          </NativeAsset>
        )}
      </NativeAdView>
    </RetroPanel>
  );
}

const styles = StyleSheet.create({
  panel: { padding: spacing.md },
  adView: { gap: spacing.md },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingRight: 24 },
  badge: { backgroundColor: colors.amber, borderWidth: 2, borderColor: colors.ink, paddingHorizontal: 5, paddingVertical: 2 },
  badgeText: { ...type.pixelXs, color: colors.ink },
  advertiser: { ...type.termSm, color: colors.muted, flexShrink: 1 },
  headerRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  icon: { width: 48, height: 48, borderRadius: 6, borderWidth: 2, borderColor: colors.ink },
  headerText: { flex: 1 },
  headline: { ...type.termMd, color: colors.cream },
  body: { ...type.termSm, color: colors.creamDim, marginTop: 2 },
  media: { width: '100%', minHeight: MIN_MEDIA_HEIGHT, borderRadius: 4, overflow: 'hidden', backgroundColor: colors.panelDeep },
  cta: {
    ...type.pixelSm,
    color: colors.cream,
    textAlign: 'center',
    backgroundColor: colors.orange,
    borderWidth: 3,
    borderColor: colors.ink,
    borderRadius: 8,
    paddingVertical: spacing.md,
    overflow: 'hidden',
  },
});
