/**
 * LocationContext.js — FIXED
 *
 * Changes from old version:
 * - ❌ NO auto-request on mount (was triggering during onboarding NameScreen)
 * - ✅ requestLocationPermission() exposed — HomeScreen calls it
 * - ✅ check() first, request() only when DENIED (first time)
 * - ✅ GRANTED → silent fetch, zero popups ever
 * - ✅ BLOCKED → custom beautiful in-app alert, shown only ONCE (AsyncStorage)
 * - ✅ Custom alert has step-by-step OS instructions
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';
import {
  Linking,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Config from 'react-native-config';

const API_BASE_URL = Config.API_BASE_URL || 'http://192.168.100.154:9000';
const BLOCKED_SHOWN_KEY = 'location_blocked_alert_shown';

const LocationContext = createContext(null);

// ════════════════════════════════════════════════════════════════════════════
// CUSTOM BLOCKED ALERT
// ════════════════════════════════════════════════════════════════════════════

function LocationBlockedAlert({ visible, onClose, onOpenSettings }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={s.overlay}>
        <View style={s.card}>
          <View style={s.iconWrapper}>
            <Text style={s.icon}>📍</Text>
          </View>

          <Text style={s.title}>Location Access Needed</Text>
          <Text style={s.subtitle}>
            Flame uses your location to show nearby profiles. Please enable it
            in Settings.
          </Text>

          <View style={s.stepsBox}>
            <Text style={s.stepsTitle}>How to enable:</Text>
            {Platform.OS === 'android' ? (
              <>
                <Text style={s.step}>1. Settings → Apps → In Flame</Text>
                <Text style={s.step}>2. Permissions → Location</Text>
                <Text style={s.step}>
                  3. Select "Allow while using the app"
                </Text>
              </>
            ) : (
              <>
                <Text style={s.step}>1. Settings → In Flame</Text>
                <Text style={s.step}>2. Tap Location</Text>
                <Text style={s.step}>3. Select "While Using the App"</Text>
              </>
            )}
          </View>

          <TouchableOpacity
            style={s.settingsBtn}
            onPress={onOpenSettings}
            activeOpacity={0.85}
          >
            <Text style={s.settingsBtnText}>Open Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.laterBtn}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={s.laterBtnText}>Maybe Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PROVIDER
// ════════════════════════════════════════════════════════════════════════════

export function LocationProvider({ token, children }) {
  const [myLocation, setMyLocation] = useState(null);
  const [showBlockedAlert, setShowBlockedAlert] = useState(false);
  const isFetching = useRef(false);

  // ── Fetch GPS coords + save to DB ──
  const fetchAndSaveLocation = useCallback(
    overrideToken => {
      if (isFetching.current) return;
      isFetching.current = true;

      Geolocation.getCurrentPosition(
        async position => {
          isFetching.current = false;
          const { latitude: lat, longitude: lng } = position.coords;
          setMyLocation({ lat, lng });
          console.log('[LocationContext] Got coords:', lat, lng);

          const t = overrideToken || token;
          if (!t) return;

          axios
            .patch(
              `${API_BASE_URL}/update-location`,
              { lat, lng },
              { headers: { Authorization: `Bearer ${t}` } },
            )
            .then(() => console.log('[LocationContext] Saved to DB'))
            .catch(err =>
              console.warn('[LocationContext] Save failed:', err.message),
            );
        },
        err => {
          isFetching.current = false;
          console.warn('[LocationContext] GPS error:', err.message);
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
      );
    },
    [token],
  );

  // ════════════════════════════════════════════════════════════════════════
  // requestLocationPermission
  // Called ONLY from HomeScreen (isProfileComplete = true users)
  // ════════════════════════════════════════════════════════════════════════

  const requestLocationPermission = useCallback(async () => {
    try {
      const permission =
        Platform.OS === 'ios'
          ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
          : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;

      // Step 1: CHECK — don't blindly request
      const status = await check(permission);
      console.log('[LocationContext] Permission status:', status);

      switch (status) {
        case RESULTS.GRANTED:
          // ✅ Already granted — silent background fetch
          // Zero popups, zero UI changes
          fetchAndSaveLocation();
          break;

        case RESULTS.DENIED:
          // First time or "ask again" eligible — show OS dialog
          const result = await request(permission);
          console.log('[LocationContext] After request:', result);
          if (result === RESULTS.GRANTED) {
            fetchAndSaveLocation();
          }
          // If denied again — respect it, don't nag
          break;

        case RESULTS.BLOCKED:
          // Permanently denied — show custom alert ONCE only
          const alreadyShown = await AsyncStorage.getItem(BLOCKED_SHOWN_KEY);
          if (!alreadyShown) {
            await AsyncStorage.setItem(BLOCKED_SHOWN_KEY, 'true');
            setShowBlockedAlert(true);
          }
          // If already shown — silently skip forever
          break;

        case RESULTS.UNAVAILABLE:
          // Emulator or device doesn't support — skip silently
          console.log('[LocationContext] Location unavailable on device');
          break;

        default:
          break;
      }
    } catch (err) {
      console.warn(
        '[LocationContext] requestLocationPermission error:',
        err.message,
      );
    }
  }, [fetchAndSaveLocation]);

  const handleOpenSettings = useCallback(() => {
    setShowBlockedAlert(false);
    Linking.openSettings();
  }, []);

  const handleCloseAlert = useCallback(() => {
    setShowBlockedAlert(false);
  }, []);

  return (
    <LocationContext.Provider value={{ myLocation, requestLocationPermission }}>
      {children}

      {/* Rendered at root level — shows above everything */}
      <LocationBlockedAlert
        visible={showBlockedAlert}
        onClose={handleCloseAlert}
        onOpenSettings={handleOpenSettings}
      />
    </LocationContext.Provider>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// HOOKS
// ════════════════════════════════════════════════════════════════════════════

// Returns { lat, lng } | null
export const useMyLocation = () => {
  const ctx = useContext(LocationContext);
  if (!ctx)
    throw new Error('useMyLocation must be used inside LocationProvider');
  return ctx.myLocation;
};

// Returns requestLocationPermission function
export const useLocationPermission = () => {
  const ctx = useContext(LocationContext);
  if (!ctx)
    throw new Error(
      'useLocationPermission must be used inside LocationProvider',
    );
  return ctx.requestLocationPermission;
};

// ════════════════════════════════════════════════════════════════════════════
// STYLES
// ════════════════════════════════════════════════════════════════════════════

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  iconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFF1F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: { fontSize: 34 },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },

  stepsBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  step: { fontSize: 13, color: '#475569', lineHeight: 22 },

  settingsBtn: {
    width: '100%',
    backgroundColor: '#FF0059',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  settingsBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  laterBtn: { width: '100%', paddingVertical: 12, alignItems: 'center' },
  laterBtnText: { fontSize: 15, fontWeight: '600', color: '#94A3B8' },
});
