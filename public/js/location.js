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
     * Request user's location with high accuracy
     * HARD-CODED to Bangalore, India coordinates
     * @returns {Promise<Object>} Location object with lat, lng, alt, accuracy
     */
    async getLocation() {
        return new Promise(async (resolve, reject) => {
            // Hard-coded coordinates for Bangalore, India
            console.log('📍 Using hard-coded location: Bangalore, India');
            
            this.currentLocation = {
                latitude: 12.868754021779418,
                longitude: 77.65127997010944,
                altitude: 920, // Bangalore's approximate elevation in meters
                accuracy: 10,
                timestamp: Date.now()
            };
            
            console.log('✅ Location set:', this.currentLocation);
            resolve(this.currentLocation);
        });
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
