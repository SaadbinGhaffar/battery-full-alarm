/**
 * Ask for a Play Store rating right after the app has proved itself.
 *
 * A real charge alarm (never the test alarm) marks a review as "pending". The
 * next time the app is in the foreground with nothing ringing, the native
 * in-app review sheet is requested. That's either right after the user taps
 * STOP in the app, or when they next open it after stopping the alarm from the
 * notification.
 *
 * Google decides whether the sheet actually appears (it has its own quota), so
 * we also limit ourselves: at most MAX_ASKS requests, ASK_GAP_DAYS apart.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

const REVIEW_KEY = '@charged/review-prompt';
const MIN_SUCCESSES = 1; // real alarms before the first ask
const MAX_ASKS = 3;
const ASK_GAP_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const EMPTY = { successes: 0, pending: false, asks: 0, lastAskAt: 0 };

let asking = false; // one request at a time in this runtime

async function load() {
  try {
    const raw = await AsyncStorage.getItem(REVIEW_KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

function save(state) {
  return AsyncStorage.setItem(REVIEW_KEY, JSON.stringify(state)).catch(() => {});
}

/** A real charge alarm just fired. Safe to call from a background runtime. */
export async function noteChargeSuccess() {
  const state = await load();
  await save({ ...state, successes: state.successes + 1, pending: true });
}

/**
 * Request the review sheet if one is due. Call only while the app is in the
 * foreground and no alarm or modal is on screen. Never throws.
 */
export async function maybeAskForReview() {
  if (asking || Platform.OS === 'web') return;
  asking = true;
  try {
    const state = await load();
    if (!state.pending || state.successes < MIN_SUCCESSES) return;
    if (state.asks >= MAX_ASKS) return;
    if (Date.now() - state.lastAskAt < ASK_GAP_DAYS * DAY_MS) return;
    if (!(await StoreReview.isAvailableAsync())) return;

    // Record the ask first so a failure or a quick app close can't cause repeats.
    await save({ ...state, pending: false, asks: state.asks + 1, lastAskAt: Date.now() });
    await StoreReview.requestReview();
  } catch {
    // the review flow is best-effort
  } finally {
    asking = false;
  }
}
