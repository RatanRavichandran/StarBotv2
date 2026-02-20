// API Manager for fetching celestial object data
const APIManager = {
    cache: new Map(),
    
    /**
     * Fetch solar system objects from NASA Horizons API
     * @param {number} latitude - Observer's latitude
     * @param {number} longitude - Observer's longitude
     * @param {number} altitude - Observer's altitude in meters
     * @param {Date} date - Observation date
     * @returns {Promise<Array>} Array of solar system objects with positions
     */
    async fetchSolarSystemObjects(latitude, longitude, altitude = 0, date = new Date()) {
        const cacheKey = `solar_${latitude}_${longitude}_${date.getTime()}`;
        
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < CONFIG.CACHE_DURATION) {
                return cached.data;
            }
        }
        
        const objects = [];
        
        // Query each solar system body
        for (const body of CONFIG.SOLAR_SYSTEM_BODIES) {
            try {
                const data = await this.queryHorizons(body.id, body.name, latitude, longitude, altitude, date);
                if (data) {
                    objects.push(data);
                }
            } catch (error) {
                console.warn(`Failed to fetch ${body.name}:`, error);
            }
        }
        
        this.cache.set(cacheKey, { data: objects, timestamp: Date.now() });
        return objects;
    },
    
    /**
     * Query NASA Horizons API for a specific body
     * @param {string} bodyId - Horizons body ID
     * @param {string} bodyName - Body name
     * @param {number} latitude - Observer's latitude
     * @param {number} longitude - Observer's longitude
     * @param {number} altitude - Observer's altitude in km
     * @param {Date} date - Observation date
     * @returns {Promise<Object>} Object position data
     */
    async queryHorizons(bodyId, bodyName, latitude, longitude, altitude, date) {
        const jd = AstronomyUtils.dateToJulianDate(date);
        const startTime = jd;
        const stopTime = jd + 0.001; // Very short time span
        
        // Format: NASA Horizons expects altitude in km
        const altKm = altitude / 1000;
        
        // Build query parameters
        const params = new URLSearchParams({
            format: 'json',
            COMMAND: bodyId,
            OBJ_DATA: 'NO',
            MAKE_EPHEM: 'YES',
            EPHEM_TYPE: 'OBSERVER',
            CENTER: `coord@399`, // Geocentric coordinates
            COORD_TYPE: 'GEODETIC',
            SITE_COORD: `${longitude},${latitude},${altKm}`,
            START_TIME: `JD${startTime}`,
            STOP_TIME: `JD${stopTime}`,
            STEP_SIZE: '1m',
            QUANTITIES: '1,4', // Astrometric RA/DEC and apparent AZ/EL
            REF_SYSTEM: 'ICRF',
            CAL_FORMAT: 'CAL',
            TIME_DIGITS: 'MINUTES',
            ANG_FORMAT: 'DEG',
            APPARENT: 'AIRLESS',
            RANGE_UNITS: 'AU',
            SUPPRESS_RANGE_RATE: 'YES',
            SKIP_DAYLT: 'NO',
            EXTRA_PREC: 'NO',
            CSV_FORMAT: 'YES'
        });
        
        try {
            let response;
            
            if (CONFIG.USE_BACKEND) {
                // Use backend proxy
                const backendUrl = `${CONFIG.BACKEND_URL}/horizons?${params}`;
                response = await fetch(backendUrl);
            } else {
                // Direct API call (CORS may block in browsers)
                const apiUrl = `${CONFIG.HORIZONS_API}?${params}`;
                response = await fetch(apiUrl);
            }
            
            if (!response.ok) {
                throw new Error(`Horizons API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Parse the ephemeris data
            const parsed = this.parseHorizonsResponse(data, bodyName);
            return parsed;
            
        } catch (error) {
            // Silently return null - fallback will be used
            return null;
        }
    },
    
    /**
     * Parse Horizons API response
     * @param {Object} response - Horizons JSON response
     * @param {string} name - Body name
     * @returns {Object} Parsed object data
     */
    parseHorizonsResponse(response, name) {
        try {
            // The response contains ephemeris data in the result field
            const result = response.result;
            
            if (!result) return null;
            
            // Extract RA and Dec from the ephemeris data
            // This is a simplified parser - actual Horizons data is complex
            // In production, you'd want more robust parsing
            
            const lines = result.split('\n');
            let ra = null, dec = null, altitude = null, azimuth = null;
            
            // Find the data section (after $$SOE marker)
            let inData = false;
            for (const line of lines) {
                if (line.includes('$$SOE')) {
                    inData = true;
                    continue;
                }
                if (line.includes('$$EOE')) {
                    break;
                }
                if (inData && line.trim() && !line.startsWith(' ')) {
                    // Parse the data line (format varies)
                    const parts = line.trim().split(/\s+/);
                    if (parts.length >= 4) {
                        // Typical format includes RA, Dec, Az, El
                        ra = parseFloat(parts[2]) / 15; // Convert degrees to hours
                        dec = parseFloat(parts[3]);
                        if (parts.length >= 6) {
                            azimuth = parseFloat(parts[4]);
                            altitude = parseFloat(parts[5]);
                        }
                        break;
                    }
                }
            }
            
            if (ra !== null && dec !== null) {
                return {
                    name,
                    type: 'planet',
                    ra,
                    dec,
                    altitude: altitude || 0,
                    azimuth: azimuth || 0
                };
            }
            
            return null;
        } catch (error) {
            console.error('Error parsing Horizons response:', error);
            return null;
        }
    },
    
    /**
     * Fetch airplanes using OpenSky Network API
     * @param {number} latitude - Observer's latitude
     * @param {number} longitude - Observer's longitude
     * @param {number} altitude - Observer's altitude in meters
     * @param {Date} date - Observation date
     * @returns {Promise<Array>} Array of airplane objects overhead
     */
    async fetchAirplanes(latitude, longitude, altitude = 0, date = new Date()) {
        const cacheKey = `airplanes_${latitude}_${longitude}_${date.getTime()}`;
        
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < CONFIG.CACHE_DURATION) {
                return cached.data;
            }
        }
        
        try {
            // Define a bounding box around the observer (approx 200km radius)
            const latDelta = 2.0; // ~200km
            const lonDelta = 2.0;
            
            const lamin = latitude - latDelta;
            const lamax = latitude + latDelta;
            const lomin = longitude - lonDelta;
            const lomax = longitude + lonDelta;
            
            const url = `${CONFIG.OPENSKY_API}?lamin=${lamin}&lamax=${lamax}&lomin=${lomin}&lomax=${lomax}`;
            
            console.log('Fetching airplanes from OpenSky Network...');
            const response = await fetch(url);
            
            if (!response.ok) {
                console.warn('OpenSky API error:', response.status);
                return [];
            }
            
            const data = await response.json();
            
            if (!data.states || data.states.length === 0) {
                console.log('No airplanes found in the area');
                return [];
            }
            
            console.log(`Found ${data.states.length} airplanes in the area`);
            
            const airplanes = [];
            
            for (const state of data.states) {
                // OpenSky state vector format:
                // [0] icao24, [1] callsign, [2] origin_country, [5] longitude, [6] latitude,
                // [7] baro_altitude, [9] velocity, [10] true_track, [13] geo_altitude
                
                const icao24 = state[0];
                const callsign = state[1] ? state[1].trim() : 'Unknown';
                const country = state[2];
                const lon = state[5];
                const lat = state[6];
                const baroAlt = state[7]; // barometric altitude in meters
                const velocity = state[9]; // m/s
                const heading = state[10]; // degrees
                const geoAlt = state[13]; // geometric altitude in meters
                const onGround = state[8]; // boolean
                const lastContact = state[4]; // unix timestamp
                
                // Skip if missing critical data
                if (lon === null || lat === null || (baroAlt === null && geoAlt === null)) {
                    continue;
                }
                
                const planeAlt = geoAlt !== null ? geoAlt : baroAlt;
                
                // Filter by altitude (only planes at reasonable cruising altitudes)
                if (planeAlt < CONFIG.MIN_AIRPLANE_ALTITUDE || planeAlt > CONFIG.MAX_AIRPLANE_ALTITUDE) {
                    continue;
                }
                
                // Calculate altitude and azimuth from observer
                const distance = this.calculateDistance(latitude, longitude, lat, lon);
                const bearing = this.calculateBearing(latitude, longitude, lat, lon);
                
                // Calculate elevation angle
                const altitudeDiff = planeAlt - altitude;
                const horizontalDist = distance * 1000; // convert to meters
                const elevationAngle = Math.atan2(altitudeDiff, horizontalDist) * 180 / Math.PI;
                
                // Only include planes above the horizon
                if (elevationAngle > 0) {
                    // Convert to RA/Dec
                    const raDec = AstronomyUtils.altAzToRADec(elevationAngle, bearing, latitude, longitude, date);
                    
                    airplanes.push({
                        name: callsign !== 'Unknown' ? `Flight ${callsign}` : `Aircraft ${icao24.toUpperCase()}`,
                        type: 'airplane',
                        callsign: callsign,
                        icao24: icao24.toUpperCase(),
                        country: country,
                        latitude: lat,  // Store actual position
                        longitude: lon, // Store actual position
                        ra: raDec.ra,
                        dec: raDec.dec,
                        altitude: elevationAngle,
                        azimuth: bearing,
                        planeAltitude: Math.round(planeAlt),
                        distance: distance.toFixed(1),
                        velocity: velocity ? Math.round(velocity * 3.6) : 0, // Convert m/s to km/h
                        heading: heading ? Math.round(heading) : 0,
                        onGround: onGround,
                        lastContact: lastContact,
                        // We'll fetch route info separately
                        origin: null,
                        destination: null
                    });
                }
            }
            
            // Sort by elevation angle (highest first)
            airplanes.sort((a, b) => b.altitude - a.altitude);
            
            // Limit results
            const topAirplanes = airplanes.slice(0, CONFIG.MAX_AIRPLANES_DISPLAY);
            
            this.cache.set(cacheKey, { data: topAirplanes, timestamp: Date.now() });
            console.log(`Processed ${topAirplanes.length} airplanes overhead`);
            
            return topAirplanes;
            
        } catch (error) {
            console.error('Error fetching airplanes:', error);
            return [];
        }
    },
    
    /**
     * Fetch flight route information for an airplane
     * Uses OpenSky Network's free route API
     * @param {string} callsign - Flight callsign
     * @param {string} icao24 - Aircraft ICAO24 transponder address
     * @returns {Promise<Object|null>} Route information or null
     */
    /**
     * Fetch flight route information for an airplane
     * Tries multiple methods to find route data
     * @param {string} callsign - Flight callsign
     * @param {string} icao24 - Aircraft ICAO24 transponder address
     * @returns {Promise<Object|null>} Route information or null
     */
    async fetchFlightRoute(callsign, icao24) {
        if (!callsign || callsign === 'Unknown' || callsign.trim() === '') {
            return null;
        }
        
        const trimmedCallsign = callsign.trim();
        
        // Try AviationStack with multiple search methods
        if (CONFIG.AVIATIONSTACK_KEY && CONFIG.AVIATIONSTACK_KEY !== '') {
            // Method 1: Try with ICAO24 code
            try {
                const url = `${CONFIG.AVIATIONSTACK_API}?access_key=${CONFIG.AVIATIONSTACK_KEY}&flight_icao=${trimmedCallsign}`;
                console.log(`Trying AviationStack with ICAO callsign: ${trimmedCallsign}`);
                
                const response = await fetch(url);
                
                if (response.ok) {
                    const data = await response.json();
                    
                    if (data && data.data && data.data.length > 0) {
                        const flight = data.data[0];
                        
                        if (flight.departure && flight.arrival && flight.departure.iata && flight.arrival.iata) {
                            console.log(`✅ Route found via AviationStack: ${flight.departure.iata} → ${flight.arrival.iata}`);
                            return {
                                origin: flight.departure.iata,
                                destination: flight.arrival.iata,
                                originName: flight.departure.airport,
                                destinationName: flight.arrival.airport,
                                airline: flight.airline ? flight.airline.name : null,
                                flightNumber: flight.flight ? flight.flight.iata : null,
                                route: [flight.departure.iata, flight.arrival.iata]
                            };
                        }
                    }
                }
            } catch (error) {
                console.warn(`AviationStack ICAO method failed:`, error.message);
            }
            
            // Method 2: Try extracting IATA code from callsign
            // IGO6J -> 6E (IndiGo IATA) + numeric part
            // This is approximate and may not work for all airlines
            const iataAttempt = this.extractIATAFromCallsign(trimmedCallsign);
            if (iataAttempt) {
                try {
                    const url = `${CONFIG.AVIATIONSTACK_API}?access_key=${CONFIG.AVIATIONSTACK_KEY}&flight_iata=${iataAttempt}`;
                    console.log(`Trying AviationStack with extracted IATA: ${iataAttempt}`);
                    
                    const response = await fetch(url);
                    
                    if (response.ok) {
                        const data = await response.json();
                        
                        if (data && data.data && data.data.length > 0) {
                            const flight = data.data[0];
                            
                            if (flight.departure && flight.arrival && flight.departure.iata && flight.arrival.iata) {
                                console.log(`✅ Route found via IATA extraction: ${flight.departure.iata} → ${flight.arrival.iata}`);
                                return {
                                    origin: flight.departure.iata,
                                    destination: flight.arrival.iata,
                                    originName: flight.departure.airport,
                                    destinationName: flight.arrival.airport,
                                    airline: flight.airline ? flight.airline.name : null,
                                    flightNumber: flight.flight ? flight.flight.iata : null,
                                    route: [flight.departure.iata, flight.arrival.iata]
                                };
                            }
                        }
                    }
                } catch (error) {
                    console.warn(`AviationStack IATA method failed:`, error.message);
                }
            }
        }
        
        console.log(`❌ No route data available for ${trimmedCallsign}`);
        return null;
    },
    
    /**
     * Attempt to extract IATA flight code from transponder callsign
     * This is approximate and won't work for all cases
     * @param {string} callsign - Transponder callsign
     * @returns {string|null} IATA code or null
     */
    extractIATAFromCallsign(callsign) {
        // Common airline code mappings (ICAO -> IATA)
        const airlineMap = {
            'IGO': '6E',    // IndiGo
            'AIC': 'AI',    // Air India
            'UAL': 'UA',    // United
            'DAL': 'DL',    // Delta
            'SWA': 'WN',    // Southwest
            'AAL': 'AA',    // American
            'AFR': 'AF',    // Air France
            'BAW': 'BA',    // British Airways
            'DLH': 'LH',    // Lufthansa
            'KLM': 'KL',    // KLM
            'UAE': 'EK',    // Emirates
            'QTR': 'QR',    // Qatar Airways
            'SIA': 'SQ',    // Singapore Airlines
            'JAL': 'JL',    // Japan Airlines
            'ANA': 'NH',    // All Nippon Airways
        };
        
        // Extract airline code (first 3 letters) and numbers
        const match = callsign.match(/^([A-Z]{2,3})(\d+)([A-Z])?$/);
        if (match) {
            const icaoCode = match[1];
            const flightNum = match[2];
            
            if (airlineMap[icaoCode]) {
                return airlineMap[icaoCode] + flightNum;
            }
        }
        
        return null;
    },
    
    /**
     * Enrich airplane data with route information
     * @param {Array} airplanes - Array of airplane objects
     * @returns {Promise<Array>} Airplanes with route data
     */
    async enrichAirplanesWithRoutes(airplanes) {
        if (!airplanes || airplanes.length === 0) {
            console.log('No airplanes to enrich with routes');
            return airplanes;
        }
        
        console.log(`📍 Fetching route information for ${airplanes.length} airplanes...`);
        console.log('Callsigns:', airplanes.map(p => p.callsign).join(', '));
        
        const enrichedAirplanes = await Promise.all(
            airplanes.map(async (plane) => {
                const route = await this.fetchFlightRoute(plane.callsign, plane.icao24);
                
                if (route) {
                    console.log(`✅ ${plane.callsign}: ${route.origin} → ${route.destination}`);
                    return {
                        ...plane,
                        origin: route.origin,
                        destination: route.destination,
                        fullRoute: route.route
                    };
                } else {
                    console.log(`❌ ${plane.callsign}: No route data available`);
                }
                
                return plane;
            })
        );
        
        const withRoutes = enrichedAirplanes.filter(p => p.origin && p.destination).length;
        console.log(`✅ Successfully fetched routes for ${withRoutes}/${airplanes.length} airplanes`);
        
        return enrichedAirplanes;
    },
    
    /**
     * Calculate distance between two coordinates (Haversine formula)
     * @param {number} lat1 - Latitude 1
     * @param {number} lon1 - Longitude 1
     * @param {number} lat2 - Latitude 2
     * @param {number} lon2 - Longitude 2
     * @returns {number} Distance in kilometers
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    },
    
    /**
     * Calculate bearing between two coordinates
     * @param {number} lat1 - Latitude 1
     * @param {number} lon1 - Longitude 1
     * @param {number} lat2 - Latitude 2
     * @param {number} lon2 - Longitude 2
     * @returns {number} Bearing in degrees (0-360)
     */
    calculateBearing(lat1, lon1, lat2, lon2) {
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const lat1Rad = lat1 * Math.PI / 180;
        const lat2Rad = lat2 * Math.PI / 180;
        
        const y = Math.sin(dLon) * Math.cos(lat2Rad);
        const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
                  Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
        
        let bearing = Math.atan2(y, x) * 180 / Math.PI;
        bearing = (bearing + 360) % 360;
        
        return bearing;
    },
    
    /**
     * Fetch satellites using CelesTrak TLE data and satellite.js
     * @param {number} latitude - Observer's latitude
     * @param {number} longitude - Observer's longitude
     * @param {number} altitude - Observer's altitude in meters
     * @param {Date} date - Observation date
     * @returns {Promise<Array>} Array of satellite objects overhead
     */
    async fetchSatellites(latitude, longitude, altitude = 0, date = new Date()) {
        const cacheKey = `satellites_${latitude}_${longitude}_${date.getTime()}`;
        
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < CONFIG.CACHE_DURATION) {
                return cached.data;
            }
        }
        
        const satellites = [];
        
        try {
            // Fetch TLE data from CelesTrak for each satellite group
            for (const group of CONFIG.SATELLITE_GROUPS) {
                const groupSats = await this.fetchSatelliteGroup(group, latitude, longitude, altitude, date);
                satellites.push(...groupSats);
            }
            
            // Sort by altitude (highest first) and limit results
            satellites.sort((a, b) => b.altitude - a.altitude);
            const topSatellites = satellites.slice(0, CONFIG.MAX_SATELLITES_DISPLAY);
            
            this.cache.set(cacheKey, { data: topSatellites, timestamp: Date.now() });
            return topSatellites;
            
        } catch (error) {
            console.error('Error fetching satellites:', error);
            return [];
        }
    },
    
    /**
     * Fetch a specific satellite group from CelesTrak
     * @param {string} group - Satellite group name
     * @param {number} latitude - Observer's latitude
     * @param {number} longitude - Observer's longitude
     * @param {number} altitude - Observer's altitude in meters
     * @param {Date} date - Observation date
     * @returns {Promise<Array>} Array of satellites from this group
     */
    async fetchSatelliteGroup(group, latitude, longitude, altitude, date) {
        try {
            const response = await fetch(`${CONFIG.CELESTRAK_API}?GROUP=${group}&FORMAT=TLE`);
            
            if (!response.ok) {
                console.warn(`Failed to fetch satellite group ${group}`);
                return [];
            }
            
            const tleData = await response.text();
            return this.processTLEData(tleData, latitude, longitude, altitude, date);
            
        } catch (error) {
            console.warn(`Error fetching satellite group ${group}:`, error);
            return [];
        }
    },
    
    /**
     * Process TLE data and calculate satellite positions
     * @param {string} tleData - TLE data string
     * @param {number} latitude - Observer's latitude
     * @param {number} longitude - Observer's longitude
     * @param {number} altitude - Observer's altitude in meters
     * @param {Date} date - Observation date
     * @returns {Array} Array of visible satellites
     */
    processTLEData(tleData, latitude, longitude, altitude, date) {
        const satellites = [];
        const lines = tleData.split('\n');
        
        // TLE format: name line, line 1, line 2
        for (let i = 0; i < lines.length - 2; i += 3) {
            const name = lines[i].trim();
            const tleLine1 = lines[i + 1].trim();
            const tleLine2 = lines[i + 2].trim();
            
            if (!name || !tleLine1 || !tleLine2) continue;
            
            try {
                // Initialize satellite record
                const satrec = satellite.twoline2satrec(tleLine1, tleLine2);
                
                // Propagate to current time
                const positionAndVelocity = satellite.propagate(satrec, date);
                
                if (positionAndVelocity.position && typeof positionAndVelocity.position !== 'boolean') {
                    // Get observer's position
                    const observerGd = {
                        longitude: longitude * Math.PI / 180,
                        latitude: latitude * Math.PI / 180,
                        height: altitude / 1000 // Convert to km
                    };
                    
                    // Calculate look angles
                    const positionEci = positionAndVelocity.position;
                    const gmst = satellite.gstime(date);
                    const positionEcf = satellite.eciToEcf(positionEci, gmst);
                    const lookAngles = satellite.ecfToLookAngles(observerGd, positionEcf);
                    
                    const azimuth = lookAngles.azimuth * 180 / Math.PI;
                    const elevation = lookAngles.elevation * 180 / Math.PI;
                    const range = lookAngles.rangeSat;
                    
                    // Only include satellites above horizon
                    if (elevation > 0) {
                        // Convert to RA/Dec
                        const raDec = AstronomyUtils.altAzToRADec(elevation, azimuth, latitude, longitude, date);
                        
                        satellites.push({
                            name,
                            type: 'satellite',
                            ra: raDec.ra,
                            dec: raDec.dec,
                            altitude: elevation,
                            azimuth,
                            range: range.toFixed(0)
                        });
                    }
                }
            } catch (error) {
                // Skip satellites that fail to process
                continue;
            }
        }
        
        return satellites;
    },
    
    /**
     * Find stars near zenith from the built-in catalog
     * @param {number} zenithRA - RA at zenith in hours
     * @param {number} zenithDec - Dec at zenith in degrees
     * @param {number} tolerance - Search radius in degrees
     * @returns {Array} Array of nearby stars
     */
    findNearbyStars(zenithRA, zenithDec, tolerance = CONFIG.NEARBY_TOLERANCE) {
        const nearbyStars = [];
        
        for (const star of CONFIG.BRIGHT_STARS) {
            const distance = AstronomyUtils.angularDistance(
                zenithRA, zenithDec,
                star.ra, star.dec
            );
            
            if (distance <= tolerance) {
                nearbyStars.push({
                    name: star.name,
                    type: 'star',
                    ra: star.ra,
                    dec: star.dec,
                    magnitude: star.mag,
                    constellation: star.constellation,
                    distance: distance.toFixed(2)
                });
            }
        }
        
        // Sort by distance from zenith
        nearbyStars.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
        
        return nearbyStars;
    },
    
    /**
     * Fetch interesting celestial bodies (asteroids, dwarf planets, comets)
     * @param {number} latitude - Observer's latitude
     * @param {number} longitude - Observer's longitude
     * @param {number} limit - Maximum number of bodies to return (default: 5)
     * @returns {Promise<Array>} Array of interesting celestial bodies
     */
    /**
     * Fetch interesting celestial bodies near zenith (straight up from location)
     * @param {number} latitude - Observer's latitude
     * @param {number} longitude - Observer's longitude
     * @param {number} zenithRA - Right Ascension at zenith
     * @param {number} zenithDec - Declination at zenith
     * @param {number} limit - Maximum number of bodies to return (default: 5)
     * @returns {Promise<Array>} Array of interesting celestial bodies near zenith
     */
    async fetchInterestingCelestialBodies(latitude, longitude, zenithRA, zenithDec, limit = 5) {
        const cacheKey = `celestial_bodies_${latitude}_${longitude}_${zenithRA.toFixed(2)}_${zenithDec.toFixed(2)}`;
        
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < CONFIG.CACHE_DURATION * 2) { // Cache for 2x duration
                return cached.data.slice(0, limit);
            }
        }
        
        try {
            // List of interesting celestial bodies to check (with their Horizons IDs)
            const interestingBodies = [
                { id: '1', name: 'Ceres', type: 'Dwarf Planet' },
                { id: '134340', name: 'Pluto', type: 'Dwarf Planet' },
                { id: '136199', name: 'Eris', type: 'Dwarf Planet' },
                { id: '136472', name: 'Makemake', type: 'Dwarf Planet' },
                { id: '136108', name: 'Haumea', type: 'Dwarf Planet' },
                { id: '4', name: 'Vesta', type: 'Asteroid' },
                { id: '2', name: 'Pallas', type: 'Asteroid' },
                { id: '10', name: 'Hygiea', type: 'Asteroid' },
                { id: '704', name: 'Interamnia', type: 'Asteroid' },
                { id: '52', name: 'Europa (Asteroid)', type: 'Asteroid' }
            ];
            
            // Fetch positions for all interesting bodies in parallel
            const bodyPromises = interestingBodies.map(async (body) => {
                try {
                    const position = await this.queryHorizons(body.id, body.name, latitude, longitude, 0, new Date());
                    if (position && position.ra !== undefined && position.dec !== undefined) {
                        // Calculate angular distance from zenith
                        const distance = AstronomyUtils.angularDistance(zenithRA, zenithDec, position.ra, position.dec);
                        
                        return {
                            name: body.name,
                            type: 'celestial_body',
                            bodyType: body.type,
                            ra: position.ra,
                            dec: position.dec,
                            altitude: position.altitude,
                            azimuth: position.azimuth,
                            distanceFromZenith: distance,
                            distance: distance.toFixed(2),
                            description: this.getCelestialBodyDescription({ bodyType: body.type, englishName: body.name }),
                            magnitude: position.magnitude
                        };
                    }
                    return null;
                } catch (error) {
                    console.warn(`Failed to fetch position for ${body.name}:`, error);
                    return null;
                }
            });
            
            // Wait for all positions
            const bodyPositions = (await Promise.all(bodyPromises)).filter(b => b !== null && b.altitude > 0);
            
            // Sort by distance from zenith (closest first)
            bodyPositions.sort((a, b) => a.distanceFromZenith - b.distanceFromZenith);
            
            console.log(`Found ${bodyPositions.length} interesting celestial bodies above horizon`);
            
            // If no bodies above horizon, return fallback
            if (bodyPositions.length === 0) {
                console.log('No celestial bodies above horizon, using fallback list');
                const fallbackBodies = this.getFallbackCelestialBodies();
                this.cache.set(cacheKey, { 
                    data: fallbackBodies, 
                    timestamp: Date.now() 
                });
                return fallbackBodies.slice(0, limit);
            }
            
            // Cache the results
            this.cache.set(cacheKey, { 
                data: bodyPositions, 
                timestamp: Date.now() 
            });
            
            return bodyPositions.slice(0, limit);
            
        } catch (error) {
            console.error('Error fetching celestial bodies:', error);
            // Return a fallback list
            return this.getFallbackCelestialBodies().slice(0, limit);
        }
    },
    
    /**
     * Get description for celestial body
     * @param {Object} body - Body data from API
     * @returns {string} Description text
     */
    getCelestialBodyDescription(body) {
        if (body.bodyType === 'Dwarf Planet') {
            return `Dwarf planet in the ${body.sideralOrbit ? (body.sideralOrbit > 200 ? 'Kuiper Belt' : 'asteroid belt') : 'solar system'}`;
        }
        if (body.bodyType === 'Asteroid') {
            return `Asteroid${body.discoveryDate ? ` discovered in ${new Date(body.discoveryDate).getFullYear()}` : ''}`;
        }
        if (body.bodyType === 'Comet') {
            return 'Icy body with characteristic tail when near the Sun';
        }
        return 'Interesting celestial object';
    },
    
    /**
     * Get fallback celestial bodies when API fails
     * @returns {Array} Array of fallback celestial bodies
     */
    getFallbackCelestialBodies() {
        // Note: These are static fallback bodies with approximate average distances.
        // Positions shown are informational only. For real-time tracking, a backend proxy
        // is needed to query NASA Horizons API without CORS restrictions.
        return [
            {
                name: 'Ceres',
                type: 'celestial_body',
                bodyType: 'Dwarf Planet',
                distance: 2.77,
                distanceUnit: 'AU',
                description: 'Largest object in the asteroid belt between Mars and Jupiter',
                meanRadius: 473,
                discoveryYear: 1801,
                moons: 0,
                density: 2.16,
                funFact: 'Ceres contains about one-third of the total mass of the asteroid belt and has a subsurface ocean beneath its icy crust. From Bangalore, it would be visible with a small telescope if above the horizon.'
            },
            {
                name: 'Pluto',
                type: 'celestial_body',
                bodyType: 'Dwarf Planet',
                distance: 39.48,
                distanceUnit: 'AU',
                description: 'Dwarf planet in the Kuiper Belt, formerly the 9th planet',
                meanRadius: 1188,
                discoveryYear: 1930,
                moons: 5,
                density: 1.86,
                funFact: 'Pluto\'s largest moon Charon is so big that Pluto and Charon orbit around a point in space between them. Light from the Sun takes over 5 hours to reach Pluto from Earth.'
            },
            {
                name: 'Eris',
                type: 'celestial_body',
                bodyType: 'Dwarf Planet',
                distance: 67.7,
                distanceUnit: 'AU',
                description: 'Most massive dwarf planet, discovery led to Pluto\'s reclassification',
                meanRadius: 1163,
                discoveryYear: 2005,
                moons: 1,
                density: 2.52,
                funFact: 'Eris is currently about three times farther from the Sun than Pluto and takes 560 years to complete one orbit. Its discovery in 2005 sparked the debate that led to the reclassification of Pluto.'
            },
            {
                name: 'Makemake',
                type: 'celestial_body',
                bodyType: 'Dwarf Planet',
                distance: 45.8,
                distanceUnit: 'AU',
                description: 'Trans-Neptunian dwarf planet named after Easter Island deity',
                meanRadius: 715,
                discoveryYear: 2005,
                moons: 1,
                density: 2.0,
                funFact: 'Makemake was discovered just after Easter in 2005 and named after the creation deity of the Rapa Nui people of Easter Island. It has a reddish-brown color similar to Pluto.'
            },
            {
                name: 'Haumea',
                type: 'celestial_body',
                bodyType: 'Dwarf Planet',
                distance: 43.3,
                distanceUnit: 'AU',
                description: 'Unusually elongated dwarf planet with rings and two moons',
                meanRadius: 816,
                discoveryYear: 2004,
                moons: 2,
                density: 2.6,
                funFact: 'Haumea spins so fast (one rotation every 4 hours) that it has been stretched into an elongated football shape. It\'s the first dwarf planet discovered to have rings, detected in 2017.'
            }
        ];
    },
    
    /**
     * Clear the cache
     */
    clearCache() {
        this.cache.clear();
    }
};
