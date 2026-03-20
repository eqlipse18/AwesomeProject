/**
 * LocationContext.js
 *
 * Handles:
 * - Permission request (once on app start)
 * - GPS fetch
 * - Save to DB (fire & forget)
 * - Provides myLocation { lat, lng } to all screens
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Platform } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import axios from 'axios';
import Config from 'react-native-config';

const API_BASE_URL = Config.API_BASE_URL || 'http://192.168.100.154:9000';

const LocationContext = createContext(null);

export function LocationProvider({ token, children }) {
  const [myLocation, setMyLocation] = useState(null); // { lat, lng } | null
  const requested = useRef(false);

  const requestLocation = useCallback(async () => {
    if (requested.current) return;
    requested.current = true;

    try {
      const permission =
        Platform.OS === 'ios'
          ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
          : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;

      const result = await request(permission);
      if (result !== RESULTS.GRANTED) {
        console.log('[LocationContext] Permission denied');
        return;
      }

      Geolocation.getCurrentPosition(
        async position => {
          const { latitude: lat, longitude: lng } = position.coords;
          setMyLocation({ lat, lng });
          console.log('[LocationContext] Got coords:', lat, lng);

          if (!token) return;

          // Save to DB — fire & forget
          axios
            .patch(
              `${API_BASE_URL}/update-location`,
              { lat, lng },
              { headers: { Authorization: `Bearer ${token}` } },
            )
            .then(() => console.log('[LocationContext] Saved to DB'))
            .catch(err =>
              console.warn('[LocationContext] Save failed:', err.message),
            );
        },
        err => console.warn('[LocationContext] GPS error:', err.message),
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
      );
    } catch (err) {
      console.warn('[LocationContext] Error:', err.message);
    }
  }, [token]);

  // Request once when token is available
  useEffect(() => {
    if (token) requestLocation();
  }, [token, requestLocation]);

  return (
    <LocationContext.Provider value={{ myLocation }}>
      {children}
    </LocationContext.Provider>
  );
}

export const useMyLocation = () => {
  const ctx = useContext(LocationContext);
  if (!ctx)
    throw new Error('useMyLocation must be used inside LocationProvider');
  return ctx.myLocation; // { lat, lng } | null
};
