// Map visualization module for airplanes
const MapManager = {
    map: null,
    userMarker: null,
    rangeCircle: null,
    airplaneMarkers: [],
    isMapVisible: false,
    highlightedCallsign: null,
    
    /**
     * Initialize the map
     * @param {number} latitude - User's latitude
     * @param {number} longitude - User's longitude
     */
    initMap(latitude, longitude) {
        // Clear existing map if any
        if (this.map) {
            this.map.remove();
        }
        
        // Create map centered on user's location
        this.map = L.map('airplaneMap', {
            zoomControl: false,
            attributionControl: false
        }).setView([latitude, longitude], 10);
        
        // Zoom control in top-right
        L.control.zoom({ position: 'topright' }).addTo(this.map);
        
        // Dark tile layer matching the space theme
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '',
            maxZoom: 19,
            subdomains: 'abcd'
        }).addTo(this.map);
        
        // Attribution in bottom-right, compact
        L.control.attribution({ position: 'bottomright', prefix: '© CARTO · OSM' }).addTo(this.map);
        
        // Range circle (approx viewing radius)
        this.rangeCircle = L.circle([latitude, longitude], {
            radius: 80000,
            color: 'rgba(74,158,255,0.25)',
            fillColor: 'rgba(74,158,255,0.04)',
            weight: 1,
            dashArray: '6 4',
            interactive: false
        }).addTo(this.map);
        
        // Add user location marker with radar pulse
        this.userMarker = L.marker([latitude, longitude], {
            icon: L.divIcon({
                className: 'user-marker-wrap',
                html: '<div class="radar-pulse"></div><div class="user-dot"></div>',
                iconSize: [40, 40],
                iconAnchor: [20, 20]
            }),
            zIndexOffset: 1000
        }).addTo(this.map);
        
        this.userMarker.bindPopup(`
            <div class="map-popup">
                <div class="popup-header">📍 Your Location</div>
                <div class="popup-coords">${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E</div>
            </div>
        `);
        
        // Add legend
        this.addLegend();
        
        console.log('Map initialized at:', latitude, longitude);
    },
    
    /**
     * Add map legend
     */
    addLegend() {
        const legend = L.control({ position: 'bottomleft' });
        legend.onAdd = () => {
            const div = L.DomUtil.create('div', 'map-legend');
            div.innerHTML = `
                <div class="legend-title">Flight Map</div>
                <div class="legend-item"><span class="legend-dot" style="background:rgba(255,255,255,0.35)"></span> Low alt (&lt;5 km)</div>
                <div class="legend-item"><span class="legend-dot" style="background:rgba(255,255,255,0.6)"></span> Cruising (5-12 km)</div>
                <div class="legend-item"><span class="legend-dot" style="background:rgba(255,255,255,0.85)"></span> High alt (&gt;12 km)</div>
                <div class="legend-item"><span class="legend-swatch" style="border-bottom:2px dashed rgba(255,255,255,0.5)"></span> Route / trajectory</div>
            `;
            return div;
        };
        legend.addTo(this.map);
    },
    
    /**
     * Add airplanes to the map
     * @param {Array} airplanes - Array of airplane objects
     * @param {number} userLat - User's latitude
     * @param {number} userLon - User's longitude
     */
    /**
     * Get altitude-based color for a plane
     */
    getAltitudeColor(altMeters) {
        if (altMeters < 5000) return 'rgba(255,255,255,0.45)';   // dim — low
        if (altMeters < 12000) return 'rgba(255,255,255,0.65)';  // mid — cruising
        return 'rgba(255,255,255,0.85)';                          // bright — high
    },
    
    displayAirplanesOnMap(airplanes, userLat, userLon) {
        // Clear existing airplane markers
        this.clearAirplaneMarkers();
        
        if (!this.map) {
            console.warn('Map not initialized');
            return;
        }
        
        console.log(`Displaying ${airplanes.length} airplanes on map`);
        
        // Add each airplane to the map
        airplanes.forEach((plane, index) => {
            if (!plane.latitude || !plane.longitude) return;
            
            const lat = plane.latitude;
            const lon = plane.longitude;
            const rotation = plane.heading || 0;
            const altColor = this.getAltitudeColor(plane.planeAltitude || 0);
            const callsign = plane.callsign && plane.callsign !== 'Unknown' ? plane.callsign : '';
            
            // Styled airplane marker with altitude color ring
            const marker = L.marker([lat, lon], {
                icon: L.divIcon({
                    className: 'plane-marker-wrap',
                    html: `<div class="plane-icon" style="--plane-color:${altColor}; transform:rotate(${rotation}deg)">✈</div>
                           ${callsign ? `<div class="plane-label">${callsign}</div>` : ''}`,
                    iconSize: [36, 44],
                    iconAnchor: [18, 22]
                }),
                title: callsign || plane.icao24,
                zIndexOffset: 100 + index
            }).addTo(this.map);
            
            // Popup
            const hasRoute = plane.origin && plane.destination;
            const altFeet = Math.round((plane.planeAltitude || 0) * 3.28084);
            const speedKnots = plane.velocity ? Math.round(plane.velocity * 0.539957) : null;
            const compass = this.getCompassDirection(plane.heading);
            
            const popupContent = `
                <div class="map-popup">
                    <div class="popup-header">✈ ${plane.name}</div>
                    ${callsign ? `<div class="popup-row"><span class="popup-label">Callsign</span><span class="popup-val">${callsign}</span></div>` : ''}
                    ${hasRoute
                        ? `<div class="popup-route">${plane.origin} <span class="popup-arrow">→</span> ${plane.destination}</div>`
                        : `<div class="popup-row"><span class="popup-label">Heading</span><span class="popup-val">${plane.heading}° ${compass}</span></div>`}
                    <div class="popup-divider"></div>
                    <div class="popup-row"><span class="popup-label">Altitude</span><span class="popup-val">${(plane.planeAltitude||0).toLocaleString()} m / ${altFeet.toLocaleString()} ft</span></div>
                    <div class="popup-row"><span class="popup-label">Speed</span><span class="popup-val">${plane.velocity ? plane.velocity + ' km/h' : '—'}${speedKnots ? ' (' + speedKnots + ' kn)' : ''}</span></div>
                    <div class="popup-row"><span class="popup-label">Distance</span><span class="popup-val">${plane.distance} km</span></div>
                    <div class="popup-row"><span class="popup-label">Elevation</span><span class="popup-val">${plane.altitude.toFixed(1)}° above horizon</span></div>
                </div>
            `;
            
            marker.bindPopup(popupContent, { className: 'starbot-popup', maxWidth: 280 });
            
            // Connection line (only on hover / popup)
            const line = L.polyline([[userLat, userLon], [lat, lon]], {
                color: altColor,
                weight: 1.5,
                opacity: 0,
                dashArray: '6,6',
                interactive: false
            }).addTo(this.map);
            
            let trajectoryLine = null;
            let arrowMarker = null;
            let destMarker = null;
            
            // Trajectory: prefer destination airport, fall back to heading projection
            const destCoords = hasRoute ? this.getAirportCoords(plane.destination) : null;
            
            if (destCoords) {
                // Draw line from plane to destination airport
                const midLat = (lat + destCoords[0]) / 2;
                const midLon = (lon + destCoords[1]) / 2;
                trajectoryLine = L.polyline([[lat, lon], [midLat, midLon], destCoords], {
                    color: 'rgba(255,255,255,0.7)',
                    weight: 1.5,
                    opacity: 0,
                    dashArray: '4,6',
                    interactive: false
                }).addTo(this.map);
                
                // Destination marker
                destMarker = L.marker(destCoords, {
                    icon: L.divIcon({
                        className: 'dest-marker-wrap',
                        html: `<div class="dest-dot"></div><div class="dest-label">${plane.destination}</div>`,
                        iconSize: [20, 20],
                        iconAnchor: [10, 10]
                    }),
                    interactive: false,
                    opacity: 0
                }).addTo(this.map);
            } else if (plane.heading != null && plane.velocity > 0) {
                // Heading-based trajectory fallback
                const trajectoryPoints = this.calculateTrajectory(lat, lon, plane.heading, plane.velocity);
                trajectoryLine = L.polyline(trajectoryPoints, {
                    color: 'rgba(255,255,255,0.7)',
                    weight: 1.5,
                    opacity: 0,
                    dashArray: '4,6',
                    interactive: false
                }).addTo(this.map);
                
                const endPoint = trajectoryPoints[trajectoryPoints.length - 1];
                arrowMarker = L.marker(endPoint, {
                    icon: L.divIcon({
                        className: 'trajectory-arrow',
                        html: `<div style="transform:rotate(${rotation}deg)">▸</div>`,
                        iconSize: [14, 14],
                        iconAnchor: [7, 7]
                    }),
                    interactive: false,
                    opacity: 0
                }).addTo(this.map);
            }
            
            // Show connection + trajectory on hover / popup
            const showLinks = () => {
                line.setStyle({ opacity: 0.5 });
                if (trajectoryLine) trajectoryLine.setStyle({ opacity: 0.6 });
                if (arrowMarker) arrowMarker.setOpacity(1);
                if (destMarker) destMarker.setOpacity(1);
            };
            const hideLinks = () => {
                line.setStyle({ opacity: 0 });
                if (trajectoryLine) trajectoryLine.setStyle({ opacity: 0 });
                if (arrowMarker) arrowMarker.setOpacity(0);
                if (destMarker) destMarker.setOpacity(0);
            };
            marker.on('mouseover', showLinks);
            marker.on('mouseout', hideLinks);
            marker.on('popupopen', showLinks);
            marker.on('popupclose', hideLinks);
            
            this.airplaneMarkers.push({ marker, line, trajectoryLine, arrowMarker, destMarker, callsign: callsign || plane.icao24 });
        });
        
        // Fit bounds
        if (airplanes.length > 0) {
            const bounds = L.latLngBounds([[userLat, userLon]]);
            airplanes.forEach(p => { if (p.latitude && p.longitude) bounds.extend([p.latitude, p.longitude]); });
            this.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 11 });
        }
    },
    
    /**
     * Highlight a specific airplane on the map (called from list cards)
     */
    highlightFlight(callsign) {
        this.airplaneMarkers.forEach(item => {
            const el = item.marker.getElement();
            if (!el) return;
            if (item.callsign === callsign) {
                el.classList.add('plane-highlighted');
                item.marker.openPopup();
                this.map.panTo(item.marker.getLatLng(), { animate: true });
            } else {
                el.classList.remove('plane-highlighted');
            }
        });
    },
    
    /**
     * Calculate trajectory points for an airplane
     * @param {number} lat - Current latitude
     * @param {number} lon - Current longitude
     * @param {number} heading - Heading in degrees
     * @param {number} velocity - Speed in km/h
     * @returns {Array} Array of [lat, lon] points
     */
    calculateTrajectory(lat, lon, heading, velocity) {
        const points = [[lat, lon]];
        
        // Validate inputs
        if (!velocity || velocity <= 0 || !heading && heading !== 0) {
            console.warn('Invalid velocity or heading for trajectory calculation');
            return points;
        }
        
        const timeMinutes = 45; // Predict 45 minutes ahead
        const steps = 12; // Number of points along trajectory
        
        // Convert velocity from km/h to km/min
        const speedKmPerMin = velocity / 60;
        
        for (let i = 1; i <= steps; i++) {
            const timeElapsed = (timeMinutes / steps) * i;
            const distanceKm = speedKmPerMin * timeElapsed;
            
            // Calculate new position using heading
            const newPos = this.calculateNewPosition(lat, lon, heading, distanceKm);
            points.push([newPos.lat, newPos.lon]);
        }
        
        return points;
    },
    
    /**
     * Calculate new position given starting point, heading, and distance
     * @param {number} lat - Starting latitude
     * @param {number} lon - Starting longitude
     * @param {number} heading - Heading in degrees
     * @param {number} distanceKm - Distance in kilometers
     * @returns {Object} New position {lat, lon}
     */
    calculateNewPosition(lat, lon, heading, distanceKm) {
        const R = 6371; // Earth radius in km
        const d = distanceKm / R; // Angular distance in radians
        const headingRad = heading * Math.PI / 180;
        const lat1 = lat * Math.PI / 180;
        const lon1 = lon * Math.PI / 180;
        
        const lat2 = Math.asin(
            Math.sin(lat1) * Math.cos(d) +
            Math.cos(lat1) * Math.sin(d) * Math.cos(headingRad)
        );
        
        const lon2 = lon1 + Math.atan2(
            Math.sin(headingRad) * Math.sin(d) * Math.cos(lat1),
            Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
        );
        
        return {
            lat: lat2 * 180 / Math.PI,
            lon: lon2 * 180 / Math.PI
        };
    },
    
    /**
     * Get compass direction from heading
     * @param {number} heading - Heading in degrees
     * @returns {string} Compass direction
     */
    getCompassDirection(heading) {
        const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        const index = Math.round(heading / 45) % 8;
        return directions[index];
    },
    
    /**
     * Clear all airplane markers from map
     */
    clearAirplaneMarkers() {
        this.airplaneMarkers.forEach(item => {
            if (item.marker) {
                this.map.removeLayer(item.marker);
            }
            if (item.line) {
                this.map.removeLayer(item.line);
            }
            if (item.trajectoryLine) {
                this.map.removeLayer(item.trajectoryLine);
            }
            if (item.arrowMarker) {
                this.map.removeLayer(item.arrowMarker);
            }
            if (item.destMarker) {
                this.map.removeLayer(item.destMarker);
            }
        });
        this.airplaneMarkers = [];
    },
    
    /**
     * Toggle map visibility
     * @returns {boolean} New visibility state
     */
    toggleMap() {
        const mapContainer = document.getElementById('airplaneMap');
        const toggleBtn = document.getElementById('toggleMapBtn');
        
        this.isMapVisible = !this.isMapVisible;
        
        if (this.isMapVisible) {
            mapContainer.classList.remove('hidden');
            toggleBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v18"/></svg> Hide Map';
            toggleBtn.classList.add('btn-ghost-active');
            
            // Invalidate map size after showing (fixes rendering issues)
            setTimeout(() => {
                if (this.map) {
                    this.map.invalidateSize();
                }
            }, 150);
        } else {
            mapContainer.classList.add('hidden');
            toggleBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z"/><path d="M8 2v16M16 6v16"/></svg> Show Map';
            toggleBtn.classList.remove('btn-ghost-active');
        }
        
        return this.isMapVisible;
    },
    
    /**
     * Update map with new data
     * @param {Array} airplanes - Array of airplane objects
     * @param {number} userLat - User's latitude
     * @param {number} userLon - User's longitude
     */
    updateMap(airplanes, userLat, userLon) {
        if (!this.map) {
            this.initMap(userLat, userLon);
        }
        
        this.displayAirplanesOnMap(airplanes, userLat, userLon);
    },
    
    /**
     * Look up approximate coordinates for an IATA airport code
     */
    getAirportCoords(iata) {
        if (!iata) return null;
        const code = iata.toUpperCase().trim();
        const db = {
            // India
            'DEL': [28.5562, 77.1000], 'BOM': [19.0896, 72.8656], 'BLR': [13.1986, 77.7066],
            'MAA': [12.9941, 80.1709], 'CCU': [22.6547, 88.4467], 'HYD': [17.2403, 78.4294],
            'COK': [10.1520, 76.4019], 'AMD': [23.0772, 72.6347], 'PNQ': [18.5822, 73.9197],
            'GOI': [15.3808, 73.8314], 'JAI': [26.8242, 75.8122], 'GAU': [26.1061, 91.5859],
            'IXR': [23.3143, 85.3217], 'PAT': [25.5913, 85.0880], 'TRV': [8.4821, 76.9201],
            'LKO': [26.7606, 80.8893], 'IXC': [30.6735, 76.7885], 'SXR': [33.9871, 74.7742],
            'VNS': [25.4524, 82.8593], 'IXB': [26.6812, 88.3286], 'NAG': [21.0922, 79.0472],
            'IDR': [22.7218, 75.8011], 'BBI': [20.2444, 85.8178], 'VTZ': [17.7212, 83.2245],
            'RPR': [21.1804, 81.7388], 'IXM': [9.8345, 78.0934], 'CJB': [11.0300, 77.0434],
            'TRZ': [10.7654, 78.7097],
            // Middle East / Gulf
            'DXB': [25.2532, 55.3657], 'AUH': [24.4330, 54.6511], 'DOH': [25.2731, 51.6083],
            'RUH': [24.9576, 46.6988], 'JED': [21.6706, 39.1566], 'MCT': [23.5933, 58.2844],
            'BAH': [26.2708, 50.6336], 'KWI': [29.2266, 47.9689], 'SHJ': [25.3286, 55.5172],
            // SE Asia
            'SIN': [1.3502, 103.9944], 'KUL': [2.7456, 101.7099], 'BKK': [13.6900, 100.7501],
            'CGK': [-6.1256, 106.6558], 'MNL': [14.5086, 121.0195], 'HAN': [21.2187, 105.8020],
            'SGN': [10.8188, 106.6520], 'RGN': [16.9073, 96.1332],
            // East Asia
            'HKG': [22.3080, 113.9185], 'NRT': [35.7647, 140.3864], 'HND': [35.5533, 139.7811],
            'ICN': [37.4602, 126.4407], 'PEK': [40.0799, 116.6031], 'PVG': [31.1443, 121.8083],
            'TPE': [25.0777, 121.2330], 'CAN': [23.3924, 113.2988],
            // Europe
            'LHR': [51.4700, -0.4543], 'CDG': [49.0097, 2.5479], 'FRA': [50.0333, 8.5706],
            'AMS': [52.3086, 4.7639], 'IST': [41.2753, 28.7519], 'MAD': [40.4983, -3.5676],
            'FCO': [41.8003, 12.2389], 'MUC': [48.3538, 11.7861], 'ZRH': [47.4647, 8.5492],
            'VIE': [48.1103, 16.5697], 'BRU': [50.9014, 4.4844], 'OSL': [60.1939, 11.1004],
            'CPH': [55.6180, 12.6561], 'ARN': [59.6519, 17.9186], 'HEL': [60.3172, 24.9633],
            'DUB': [53.4213, -6.2701], 'LIS': [38.7813, -9.1359], 'ATH': [37.9364, 23.9445],
            'BCN': [41.2971, 2.0785], 'MXP': [45.6306, 8.7281], 'LGW': [51.1537, -0.1821],
            'STN': [51.8850, 0.2350], 'SVO': [55.9726, 37.4146], 'DME': [55.4088, 37.9063],
            // North America
            'JFK': [40.6413, -73.7781], 'LAX': [33.9425, -118.4081], 'ORD': [41.9742, -87.9073],
            'ATL': [33.6407, -84.4277], 'DFW': [32.8998, -97.0403], 'DEN': [39.8561, -104.6737],
            'SFO': [37.6213, -122.3790], 'SEA': [47.4502, -122.3088], 'MIA': [25.7959, -80.2870],
            'BOS': [42.3656, -71.0096], 'EWR': [40.6895, -74.1745], 'IAD': [38.9531, -77.4565],
            'YYZ': [43.6777, -79.6248], 'YVR': [49.1947, -123.1790], 'MEX': [19.4361, -99.0719],
            // Oceania
            'SYD': [-33.9399, 151.1753], 'MEL': [-37.6690, 144.8410], 'AKL': [-37.0082, 174.7850],
            // Africa
            'JNB': [-26.1392, 28.2460], 'CAI': [30.1219, 31.4056], 'ADD': [8.9779, 38.7993],
            'NBO': [-1.3192, 36.9278], 'LOS': [6.5774, 3.3212],
            // South America
            'GRU': [-23.4356, -46.4731], 'EZE': [-34.8222, -58.5358], 'BOG': [4.7016, -74.1469],
            'SCL': [-33.3930, -70.7858], 'LIM': [-12.0219, -77.1143]
        };
        return db[code] || null;
    },
    
    /**
     * Destroy the map
     */
    destroyMap() {
        if (this.map) {
            this.map.remove();
            this.map = null;
            this.userMarker = null;
            this.airplaneMarkers = [];
            this.isMapVisible = false;
        }
    }
};
