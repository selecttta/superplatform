import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

export function useLocation() {
    const [location, setLocation] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const getLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setError('Geolocation not supported');
            toast.error('Your browser does not support location services');
            return;
        }
        setLoading(true);
        setError(null);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
                setLoading(false);
            },
            (err) => {
                setError(err.message);
                setLoading(false);
                if (err.code === 1) toast.error('Please enable location access');
                else toast.error('Could not get your location');
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
        );
    }, []);

    useEffect(() => { getLocation(); }, [getLocation]);

    // Calculate distance between two coordinates (Haversine formula)
    const distanceTo = useCallback((lat2, lng2) => {
        if (!location) return null;
        const R = 6371;
        const dLat = (lat2 - location.lat) * Math.PI / 180;
        const dLng = (lng2 - location.lng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(location.lat * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }, [location]);

    const fmtDist = useCallback((km) => {
        if (km === null) return '—';
        return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
    }, []);

    return { location, loading, error, getLocation, distanceTo, fmtDist };
}
