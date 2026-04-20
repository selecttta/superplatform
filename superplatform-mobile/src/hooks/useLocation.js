import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

/**
 * useLocation — requests permission, gets current position,
 * and (for providers) continuously broadcasts lat/lng to Supabase.
 *
 * @param {boolean} broadcast — if true, update DB with current location every 10s (for drivers/providers)
 */
export function useLocation({ broadcast = false } = {}) {
  const { user, role } = useAuthStore();
  const [location,   setLocation]   = useState(null);
  const [address,    setAddress]    = useState('');
  const [permStatus, setPermStatus] = useState(null);
  const [error,      setError]      = useState(null);
  const watchRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermStatus(status);
      if (status !== 'granted') {
        setError('Location permission denied');
        return;
      }

      // Get initial position
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation(pos.coords);

      // Reverse geocode
      const addr = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude, longitude: pos.coords.longitude,
      });
      if (addr[0]) {
        setAddress(`${addr[0].street || ''} ${addr[0].city || ''}`.trim());
      }

      // Broadcast for providers/drivers
      if (broadcast && user && role === 'provider') {
        watchRef.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 10000, distanceInterval: 20 },
          async (newPos) => {
            setLocation(newPos.coords);
            await supabase.from('profiles').update({
              current_lat: newPos.coords.latitude,
              current_lng: newPos.coords.longitude,
              updated_at:  new Date().toISOString(),
            }).eq('id', user.id);
          }
        );
      }
    })();

    return () => { if (watchRef.current) watchRef.current.remove(); };
  }, [user, role, broadcast]);

  return { location, address, permStatus, error };
}
