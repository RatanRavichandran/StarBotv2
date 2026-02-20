// Main application controller
const App = {
    currentLocation: null,
    currentZenithCoords: null,
    clockInterval: null,
    
    /**
     * Initialize the application
     */
    init() {
        console.log('%c✦ StarBot — Sky Object Detector', 'font-size: 20px; font-weight: bold; color: #4a9eff;');
        console.log('%cInitializing...', 'color: #8899bb;');
        
        // Start live UTC clock
        this.startClock();
        
        // Set up event listeners (only for elements that still exist)
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
                MapManager.toggleMap();
            });
        }
        
        // Map starts visible
        MapManager.isMapVisible = true;
        
        // Collapsible sections
        this.setupCollapsible('airplaneHeader', 'airplaneCollapsibleContent');
        this.setupCollapsible('satelliteHeader', 'satelliteCollapsibleContent');
        this.setupCollapsible('planetHeader', 'planetCollapsibleContent');
        this.setupCollapsible('starHeader', 'starCollapsibleContent');
        this.setupCollapsible('celestialBodyHeader', 'celestialBodyCollapsibleContent');
        
        // Keyboard shortcut: R to refresh
        document.addEventListener('keydown', (e) => {
            if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey && !e.altKey && document.activeElement.tagName !== 'INPUT') {
                this.refreshSkyData();
            }
        });
        
        console.log('%c✅ Application ready', 'color: #51cf66; font-weight: bold;');
        
        // Auto-start the sky scan with hard-coded location
        this.detectLocationAndScan();
    },
    
    /**
     * Start live UTC clock in header
     */
    startClock() {
        const el = document.getElementById('liveTime');
        if (!el) return;
        
        const update = () => {
            const now = new Date();
            el.textContent = now.toISOString().split('T')[1].split('.')[0];
        };
        update();
        this.clockInterval = setInterval(update, 1000);
    },
    
    /**
     * Setup a collapsible section toggle
     */
    setupCollapsible(headerId, contentId) {
        const header = document.getElementById(headerId);
        if (!header) return;
        header.addEventListener('click', () => {
            const content = document.getElementById(contentId);
            const chevron = header.querySelector('.collapse-chevron');
            if (content.style.display === 'none') {
                content.style.display = 'block';
                if (chevron) chevron.classList.add('expanded');
            } else {
                content.style.display = 'none';
                if (chevron) chevron.classList.remove('expanded');
            }
        });
    },
    
    /**
     * Detect location and scan the sky
     */
    async detectLocationAndScan() {
        try {
            DisplayController.clearError();
            DisplayController.showLoading();
            
            // Get user's location
            console.log('📍 Getting location...');
            this.currentLocation = await LocationManager.getLocation();
            console.log('✅ Location obtained:', this.currentLocation);
            
            document.getElementById('loadingMessage').textContent = 'Scanning the sky above you...';
            
            // Display location
            DisplayController.displayLocation(this.currentLocation);
            
            // Scan the sky
            await this.scanSky();
            
        } catch (error) {
            console.error('❌ Error:', error);
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
    
    /**
     * Scan the sky for celestial objects
     */
    async scanSky() {
        try {
            if (!this.currentLocation) {
                throw new Error('Location not available. Please detect your location first.');
            }
            
            const { latitude, longitude, altitude } = this.currentLocation;
            const now = new Date();
            
            console.log('🔭 Calculating zenith coordinates...');
            
            // Calculate zenith coordinates
            this.currentZenithCoords = AstronomyUtils.geographicToZenithCelestial(
                latitude, 
                longitude, 
                now
            );
            
            console.log('✅ Zenith coords:', this.currentZenithCoords);
            
            // Display celestial coordinates
            DisplayController.displayCelestialCoordinates(this.currentZenithCoords);
            
            console.log('🌠 Fetching celestial objects...');
            
            // Fetch all celestial objects in parallel
            const [planets, rawAirplanes, satellites, stars, celestialBodies] = await Promise.all([
                APIManager.fetchSolarSystemObjects(latitude, longitude, altitude, now)
                    .catch(err => {
                        console.warn('Failed to fetch planets:', err);
                        return [];
                    }),
                APIManager.fetchAirplanes(latitude, longitude, altitude, now)
                    .catch(err => {
                        console.warn('Failed to fetch airplanes:', err);
                        return [];
                    }),
                APIManager.fetchSatellites(latitude, longitude, altitude, now)
                    .catch(err => {
                        console.warn('Failed to fetch satellites:', err);
                        return [];
                    }),
                Promise.resolve(APIManager.findNearbyStars(
                    this.currentZenithCoords.ra, 
                    this.currentZenithCoords.dec
                )),
                APIManager.fetchInterestingCelestialBodies(
                    latitude, 
                    longitude, 
                    this.currentZenithCoords.ra,
                    this.currentZenithCoords.dec,
                    5
                )
                    .catch(err => {
                        console.warn('Failed to fetch celestial bodies:', err);
                        return [];
                    })
            ]);
            
            // Enrich airplanes with route information
            console.log('✈️ Fetching flight routes...');
            const airplanes = await APIManager.enrichAirplanesWithRoutes(rawAirplanes)
                .catch(err => {
                    console.warn('Failed to fetch routes, using basic airplane data:', err);
                    return rawAirplanes;
                });
            
            console.log(`✅ Found ${planets.length} planets, ${airplanes.length} airplanes, ${satellites.length} satellites, ${stars.length} stars, ${celestialBodies.length} celestial bodies`);
            
            // Categorize objects by distance from zenith
            const results = this.categorizeObjects(
                planets,
                airplanes,
                satellites, 
                stars,
                this.currentZenithCoords,
                celestialBodies
            );
            
            // Display results
            await DisplayController.displayResults(results);
            
            console.log('✅ Sky scan complete');
            
        } catch (error) {
            console.error('❌ Error scanning sky:', error);
            DisplayController.showError('Failed to scan the sky: ' + error.message);
        }
    },
    
    /**
     * Categorize objects by their distance from zenith
     * @param {Array} planets - Planet objects
     * @param {Array} airplanes - Airplane objects
     * @param {Array} satellites - Satellite objects
     * @param {Array} stars - Star objects
     * @param {Object} zenithCoords - Zenith coordinates
     * @returns {Object} Categorized objects
     */
    categorizeObjects(planets, airplanes, satellites, stars, zenithCoords, celestialBodies = []) {
        const allObjects = [...planets, ...airplanes, ...satellites, ...stars];
        
        // Calculate distance from zenith for each object
        allObjects.forEach(obj => {
            if (obj.ra !== undefined && obj.dec !== undefined) {
                obj.distanceFromZenith = AstronomyUtils.angularDistance(
                    zenithCoords.ra, 
                    zenithCoords.dec,
                    obj.ra, 
                    obj.dec
                );
            } else {
                obj.distanceFromZenith = 999; // Unknown distance
            }
        });
        
        // Separate objects at zenith (within tolerance)
        const zenithObjects = allObjects.filter(
            obj => obj.distanceFromZenith <= CONFIG.ZENITH_TOLERANCE
        ).sort((a, b) => a.distanceFromZenith - b.distanceFromZenith);
        
        // Separate nearby objects (within nearby tolerance but not at zenith)
        const nearbyObjects = allObjects.filter(
            obj => obj.distanceFromZenith > CONFIG.ZENITH_TOLERANCE && 
                   obj.distanceFromZenith <= CONFIG.NEARBY_TOLERANCE
        ).sort((a, b) => a.distanceFromZenith - b.distanceFromZenith);
        
        // Add distance info to objects
        [...zenithObjects, ...nearbyObjects].forEach(obj => {
            obj.distance = obj.distanceFromZenith.toFixed(2);
        });
        
        // Filter and sort satellites: limit to 7 closest, max 3 Starlink
        const sortedSatellites = satellites
            .filter(s => s.altitude > 0)
            .sort((a, b) => a.distanceFromZenith - b.distanceFromZenith);
        
        const filteredSatellites = [];
        let starlinkCount = 0;
        
        for (const sat of sortedSatellites) {
            const isStarlink = sat.name && sat.name.toLowerCase().includes('starlink');
            
            if (isStarlink) {
                if (starlinkCount < 3) {
                    filteredSatellites.push(sat);
                    starlinkCount++;
                }
            } else {
                filteredSatellites.push(sat);
            }
            
            if (filteredSatellites.length >= 7) break;
        }
        
        console.log(`Filtered satellites: ${filteredSatellites.length} (${starlinkCount} Starlink)`);
        
        return {
            zenithObjects,
            nearbyObjects,
            airplanes: airplanes.filter(p => p.altitude > 0),
            satellites: filteredSatellites,
            planets: planets.filter(p => p.altitude > 0),
            stars: stars,
            celestialBodies: celestialBodies.slice(0, 5) // Limit to 5 interesting celestial bodies
        };
    },
    
    /**
     * Refresh sky data with current location
     */
    async refreshSkyData() {
        if (!this.currentLocation) {
            DisplayController.showError('Please detect your location first.');
            return;
        }
        
        console.log('🔄 Refreshing sky data...');
        DisplayController.showLoading();
        
        // Clear cache to force fresh data
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
