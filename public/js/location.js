// Location detection module using Geolocation API
const LocationManager = {
    currentLocation: null,
    
    /**
     * Check if location permission is granted
     * @returns {Promise<string>} Permission state
     */
    async checkPermission() {
        if (navigator.permissions && navigator.permissions.query) {
            try {
                const result = await navigator.permissions.query({ name: 'geolocation' });
                console.log('Location permission state:', result.state);
                return result.state; // 'granted', 'denied', or 'prompt'
            } catch (error) {
                console.warn('Cannot query permissions:', error);
                return 'unknown';
            }
        }
        return 'unknown';
    },
    
    /**
     * Request user's location via browser Geolocation API
     * Falls back to IP-based geolocation if denied/unavailable
     * @returns {Promise<Object>} Location object with lat, lng, alt, accuracy
     */
    async getLocation() {
        // Try browser geolocation first
        if (navigator.geolocation) {
            try {
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 60000
                    });
                });

                this.currentLocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    altitude: position.coords.altitude || 0,
                    accuracy: position.coords.accuracy,
                    timestamp: position.timestamp
                };

                console.log('📍 Got browser location:', this.currentLocation);
                return this.currentLocation;
            } catch (error) {
                console.warn('Geolocation failed, trying IP fallback:', error.message);
            }
        }

        // Fallback: IP-based geolocation
        try {
            const resp = await fetch('https://ipapi.co/json/');
            const data = await resp.json();

            this.currentLocation = {
                latitude: data.latitude,
                longitude: data.longitude,
                altitude: 0,
                accuracy: 5000, // IP geolocation is rough
                timestamp: Date.now()
            };

            console.log('📍 Got IP-based location:', this.currentLocation);
            return this.currentLocation;
        } catch (ipError) {
            console.error('IP geolocation also failed:', ipError);
            throw new Error('Unable to determine your location. Please allow location access and try again.');
        }
    },
    
    /**
     * Watch user's location for continuous updates
     * @param {Function} callback - Called with location updates
     * @returns {number} Watch ID for clearing later
     */
    watchLocation(callback) {
        if (!navigator.geolocation) {
            throw new Error('Geolocation is not supported');
        }
        
        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 5000
        };
        
        return navigator.geolocation.watchPosition(
            (position) => {
                this.currentLocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    altitude: position.coords.altitude || 0,
                    accuracy: position.coords.accuracy,
                    timestamp: position.timestamp
                };
                callback(this.currentLocation);
            },
            (error) => {
                console.error('Location watch error:', error);
            },
            options
        );
    },
    
    /**
     * Stop watching location
     * @param {number} watchId - Watch ID returned from watchLocation
     */
    clearWatch(watchId) {
        if (navigator.geolocation && watchId) {
            navigator.geolocation.clearWatch(watchId);
        }
    },
    
    /**
     * Get current stored location without requesting new one
     * @returns {Object|null} Current location or null
     */
    getCurrentLocation() {
        return this.currentLocation;
    },
    
    /**
     * Format location for display
     * @param {Object} location - Location object
     * @returns {Object} Formatted location data
     */
    formatLocation(location) {
        return {
            latitude: location.latitude.toFixed(6),
            longitude: location.longitude.toFixed(6),
            altitude: Math.round(location.altitude),
            accuracy: Math.round(location.accuracy)
        };
    }
};
