// Main application controller
const App = {
    currentLocation: null,
    currentZenithCoords: null,
    
    /**
     * Initialize the application
     */
    init() {
        // Set up event listeners
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshSkyData();
            });
        }
        
        // Map toggle
        const toggleMapBtn = document.getElementById('toggleMapBtn');
        if (toggleMapBtn) {
            toggleMapBtn.addEventListener('click', () => {
                const isVisible = MapManager.toggleMap();
                
                // If map is now visible and we have airplane data, display it
                if (isVisible && DisplayController.currentAirplanes.length > 0 && DisplayController.currentLocation) {
                    MapManager.updateMap(
                        DisplayController.currentAirplanes,
                        DisplayController.currentLocation.latitude,
                        DisplayController.currentLocation.longitude
                    );
                }
            });
        }
        
        // Collapsible airplane section toggle
        const airplaneHeader = document.getElementById('airplaneHeader');
        if (airplaneHeader) {
            airplaneHeader.addEventListener('click', () => {
                const content = document.getElementById('airplaneCollapsibleContent');
                const toggleIcon = airplaneHeader.querySelector('.collapsible-toggle');
                
                if (content.style.display === 'none') {
                    content.style.display = 'block';
                    toggleIcon.classList.add('expanded');
                } else {
                    content.style.display = 'none';
                    toggleIcon.classList.remove('expanded');
                }
            });
        }
        
        // Collapsible satellite section toggle
        const satelliteHeader = document.getElementById('satelliteHeader');
        if (satelliteHeader) {
            satelliteHeader.addEventListener('click', () => {
                const content = document.getElementById('satelliteCollapsibleContent');
                const toggleIcon = satelliteHeader.querySelector('.collapsible-toggle');
                
                if (content.style.display === 'none') {
                    content.style.display = 'block';
                    toggleIcon.classList.add('expanded');
                } else {
                    content.style.display = 'none';
                    toggleIcon.classList.remove('expanded');
                }
            });
        }
        
        // Auto-start
        this.detectLocationAndScan();
    },
    
    async detectLocationAndScan() {
        try {
            DisplayController.clearError();
            DisplayController.showLoading();

            this.currentLocation = await LocationManager.getLocation();
            document.getElementById('loadingMessage').textContent = 'Scanning the sky above you...';
            DisplayController.displayLocation(this.currentLocation);

            await this.scanSky();
        } catch (error) {
            console.error('Error:', error);
            DisplayController.showError(error.message);
        }
    },
    
    /**
     * Use manually entered location
     */
    async useManualLocation() {
        try {
            const lat = parseFloat(document.getElementById('manualLatitude').value);
            const lng = parseFloat(document.getElementById('manualLongitude').value);
            const alt = parseFloat(document.getElementById('manualAltitude').value) || 0;
            
            // Validate inputs
            if (isNaN(lat) || isNaN(lng)) {
                DisplayController.showError('Please enter valid latitude and longitude values.');
                return;
            }
            
            if (lat < -90 || lat > 90) {
                DisplayController.showError('Latitude must be between -90 and 90 degrees.');
                return;
            }
            
            if (lng < -180 || lng > 180) {
                DisplayController.showError('Longitude must be between -180 and 180 degrees.');
                return;
            }
            
            DisplayController.clearError();
            DisplayController.showLoading();
            
            // Set manual location
            this.currentLocation = {
                latitude: lat,
                longitude: lng,
                altitude: alt,
                accuracy: 0, // Manual entry has no accuracy measurement
                timestamp: Date.now()
            };
            
            console.log('✅ Manual location set:', this.currentLocation);
            
            // Display location
            DisplayController.displayLocation(this.currentLocation);
            
            // Hide manual form
            document.getElementById('manualLocationForm').classList.add('hidden');
            
            // Scan the sky
            await this.scanSky();
            
        } catch (error) {
            console.error('❌ Error:', error);
            DisplayController.showError('Failed to use manual location: ' + error.message);
        }
    },
    
    async scanSky() {
        try {
            if (!this.currentLocation) {
                throw new Error('Location not available. Please detect your location first.');
            }

            const { latitude, longitude, altitude } = this.currentLocation;
            const now = new Date();

            this.currentZenithCoords = AstronomyUtils.geographicToZenithCelestial(latitude, longitude, now);
            DisplayController.displayCelestialCoordinates(this.currentZenithCoords);

            // Reveal results container immediately; sections fade in as each data source responds
            DisplayController.hideLoading();
            DisplayController.showResultsContainer();

            // Stars are synchronous — show instantly
            const stars = APIManager.findNearbyStars(this.currentZenithCoords.ra, this.currentZenithCoords.dec);
            if (stars.length > 0) DisplayController.displayStars(stars);

            // Fire all async fetches independently; each renders as it arrives
            const tasks = [
                APIManager.fetchSatellites(latitude, longitude, altitude, now)
                    .then(sats => {
                        const filtered = this.filterSatellites(sats);
                        if (filtered.length > 0) DisplayController.displaySatellites(filtered);
                    })
                    .catch(() => {}),

                APIManager.fetchSolarSystemObjects(latitude, longitude, altitude, now)
                    .then(planets => {
                        const visible = planets.filter(p => p.altitude > 0);
                        if (visible.length > 0) DisplayController.displayPlanets(visible);
                    })
                    .catch(() => {}),

                APIManager.fetchAirplanes(latitude, longitude, altitude, now)
                    .then(raw => APIManager.enrichAirplanesWithRoutes(raw))
                    .then(planes => {
                        const visible = planes.filter(p => p.altitude > 0);
                        if (visible.length > 0) DisplayController.displayAirplanes(visible);
                    })
                    .catch(() => {}),

                APIManager.fetchInterestingCelestialBodies(
                    latitude, longitude,
                    this.currentZenithCoords.ra, this.currentZenithCoords.dec, 5
                )
                    .then(bodies => {
                        if (bodies.length > 0) DisplayController.displayCelestialBodies(bodies);
                    })
                    .catch(() => {})
            ];

            await Promise.allSettled(tasks);
            DisplayController.showRefreshButton();

        } catch (error) {
            console.error('Error scanning sky:', error);
            DisplayController.showError('Failed to scan the sky: ' + error.message);
        }
    },

    filterSatellites(satellites) {
        const sorted = satellites
            .filter(s => s.altitude > 0)
            .sort((a, b) => b.altitude - a.altitude);

        const filtered = [];
        let starlinkCount = 0;

        for (const sat of sorted) {
            const isStarlink = sat.name?.toLowerCase().includes('starlink');
            if (isStarlink) {
                if (starlinkCount < 3) { filtered.push(sat); starlinkCount++; }
            } else {
                filtered.push(sat);
            }
            if (filtered.length >= 7) break;
        }
        return filtered;
    },
    
    async refreshSkyData() {
        if (!this.currentLocation) {
            DisplayController.showError('Please detect your location first.');
            return;
        }

        DisplayController.showLoading();
        APIManager.clearCache();
        await this.scanSky();
    }
};

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
} else {
    App.init();
}
