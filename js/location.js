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
    
    async getLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                return this.getIPLocation().then(resolve).catch(() =>
                    reject(new Error('Geolocation is not supported by your browser.'))
                );
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.currentLocation = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        altitude: position.coords.altitude || 0,
                        accuracy: position.coords.accuracy,
                        timestamp: position.timestamp
                    };
                    resolve(this.currentLocation);
                },
                async (error) => {
                    console.warn('Geolocation failed, trying IP fallback:', error.message);
                    try {
                        resolve(await this.getIPLocation());
                    } catch {
                        reject(new Error('Could not determine your location. Please allow location access and try again.'));
                    }
                },
                { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
            );
        });
    },

    async getIPLocation() {
        const response = await fetch('https://ipapi.co/json/');
        if (!response.ok) throw new Error('IP location service unavailable');
        const data = await response.json();
        if (!data.latitude || !data.longitude) throw new Error('Could not parse IP location');
        this.currentLocation = {
            latitude: data.latitude,
            longitude: data.longitude,
            altitude: 0,
            accuracy: 50000,
            timestamp: Date.now()
        };
        return this.currentLocation;
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
