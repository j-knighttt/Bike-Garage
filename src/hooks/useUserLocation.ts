import * as Location from 'expo-location';
import { useCallback, useState } from 'react';

export type LocationStatus = 'idle' | 'loading' | 'granted' | 'denied' | 'error';

export interface UserLocation {
  lat: number;
  lng: number;
}

/**
 * Thin wrapper around expo-location: asks for permission and returns the
 * rider's coordinates. Everything degrades gracefully — if permission is
 * denied the UI simply shows providers without a distance.
 */
export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [status, setStatus] = useState<LocationStatus>('idle');

  const request = useCallback(async () => {
    try {
      setStatus('loading');
      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (perm !== 'granted') {
        setStatus('denied');
        return null;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setLocation(coords);
      setStatus('granted');
      return coords;
    } catch {
      setStatus('error');
      return null;
    }
  }, []);

  return { location, status, request };
}
