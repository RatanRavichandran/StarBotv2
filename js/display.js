// Display controller for rendering results to the UI
const DisplayController = {
    currentAirplanes: [],
    currentLocation: null,
    
    /**
     * Show loading indicator
     */
    showLoading() {
        document.getElementById('loadingIndicator').classList.remove('hidden');
        document.getElementById('errorDisplay').classList.add('hidden');
        document.getElementById('resultsSection').classList.add('hidden');
    },
    
    /**
     * Hide loading indicator
     */
    hideLoading() {
        document.getElementById('loadingIndicator').classList.add('hidden');
    },
    
    /**
     * Show error message
     * @param {string} message - Error message to display
     */
    showError(message) {
        const errorDisplay = document.getElementById('errorDisplay');
        // Convert newlines to <br> tags for better formatting
        const formattedMessage = message.replace(/\n/g, '<br>');
        errorDisplay.innerHTML = formattedMessage;
        errorDisplay.classList.remove('hidden');
        this.hideLoading();
    },
    
    /**
     * Clear error message
     */
    clearError() {
        document.getElementById('errorDisplay').classList.add('hidden');
    },
    
    /**
     * Display location information
     * @param {Object} location - Location data
     */
    displayLocation(location) {
        const formatted = LocationManager.formatLocation(location);
        
        document.getElementById('latitude').textContent = formatted.latitude;
        document.getElementById('longitude').textContent = formatted.longitude;
        document.getElementById('altitude').textContent = formatted.altitude;
        document.getElementById('accuracy').textContent = formatted.accuracy === 0 ? 'Manual Entry' : formatted.accuracy;
        
        document.getElementById('locationInfo').classList.remove('hidden');
        
        // Store location for map
        this.currentLocation = location;
    },
    
    /**
     * Display celestial coordinates
     * @param {Object} coords - Celestial coordinates (ra, dec, lst)
     */
    displayCelestialCoordinates(coords) {
        document.getElementById('ra').textContent = AstronomyUtils.formatRA(coords.ra);
        document.getElementById('dec').textContent = AstronomyUtils.formatDec(coords.dec);
        document.getElementById('lst').textContent = AstronomyUtils.formatLST(coords.lst);
        
        document.getElementById('celestialInfo').classList.remove('hidden');
    },
    
    showResultsContainer() {
        document.getElementById('resultsSection').classList.remove('hidden');
        document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();
    },

    showRefreshButton() {
        document.getElementById('refreshSection').classList.remove('hidden');
    },

    reveal(container) {
        container.classList.remove('hidden', 'fade-in');
        void container.offsetWidth; // force reflow so animation restarts on refresh
        container.classList.add('fade-in');
    },

    async displayResults(results) {
        this.hideLoading();
        document.getElementById('resultsSection').classList.remove('hidden');
        document.getElementById('refreshSection').classList.remove('hidden');
        document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();
        
        const { zenithObjects, nearbyObjects, airplanes, satellites, planets, stars, celestialBodies } = results;
        
        // Display zenith objects
        if (zenithObjects.length > 0) {
            await this.displayZenithObjects(zenithObjects);
        } else {
            document.getElementById('zenithObject').classList.add('hidden');
        }
        
        // Display nearby objects
        if (nearbyObjects.length > 0) {
            await this.displayNearbyObjects(nearbyObjects);
        } else {
            document.getElementById('nearbyObjects').classList.add('hidden');
        }
        
        // Display airplanes
        if (airplanes && airplanes.length > 0) {
            await this.displayAirplanes(airplanes);
        } else {
            document.getElementById('airplaneObjects').classList.add('hidden');
        }
        
        // Display satellites
        if (satellites.length > 0) {
            await this.displaySatellites(satellites);
        } else {
            document.getElementById('satelliteObjects').classList.add('hidden');
        }
        
        // Display planets
        if (planets.length > 0) {
            await this.displayPlanets(planets);
        } else {
            document.getElementById('planetObjects').classList.add('hidden');
        }
        
        // Display stars
        if (stars.length > 0) {
            await this.displayStars(stars);
        } else {
            document.getElementById('starObjects').classList.add('hidden');
        }
        
        // Display interesting celestial bodies
        if (celestialBodies && celestialBodies.length > 0) {
            console.log('Displaying', celestialBodies.length, 'celestial bodies');
            this.displayCelestialBodies(celestialBodies);
        } else {
            console.log('No celestial bodies to display');
            const celestialSection = document.getElementById('celestialBodyObjects');
            if (celestialSection) {
                celestialSection.classList.add('hidden');
            }
        }
        
        // Show no results message if nothing found
        if (zenithObjects.length === 0 && nearbyObjects.length === 0 && 
            (airplanes || []).length === 0 && satellites.length === 0 && 
            planets.length === 0 && stars.length === 0) {
            document.getElementById('noResults').classList.remove('hidden');
        } else {
            document.getElementById('noResults').classList.add('hidden');
        }
    },
    
    /**
     * Display objects at zenith
     * @param {Array} objects - Objects at zenith
     */
    async displayZenithObjects(objects) {
        const container = document.getElementById('zenithObject');
        const content = document.getElementById('zenithContent');
        content.innerHTML = '';
        this.reveal(container);
        for (const obj of objects) {
            const objDiv = await this.createObjectElement(obj, true);
            content.appendChild(objDiv);
        }
    },

    async displayNearbyObjects(objects) {
        const container = document.getElementById('nearbyObjects');
        const content = document.getElementById('nearbyContent');
        content.innerHTML = '';
        this.reveal(container);
        const objectsToDisplay = objects.slice(0, CONFIG.MAX_NEARBY_OBJECTS);
        for (const obj of objectsToDisplay) {
            const objDiv = await this.createObjectElement(obj, false);
            content.appendChild(objDiv);
        }
    },

    async displaySatellites(satellites) {
        const container = document.getElementById('satelliteObjects');
        const content = document.getElementById('satelliteContent');
        const countSpan = document.getElementById('satelliteCount');
        content.innerHTML = '';
        if (countSpan) countSpan.textContent = satellites.length;
        this.reveal(container);
        for (const sat of satellites) {
            const satDiv = await this.createObjectElement(sat, false);
            satDiv.classList.add('satellite-item');
            content.appendChild(satDiv);
        }
    },

    async displayAirplanes(airplanes) {
        const container = document.getElementById('airplaneObjects');
        const content = document.getElementById('airplaneContent');
        const countSpan = document.getElementById('airplaneCount');
        content.innerHTML = '';
        if (countSpan) countSpan.textContent = airplanes.length;
        this.reveal(container);
        this.currentAirplanes = airplanes;
        for (const plane of airplanes) {
            const planeDiv = await this.createObjectElement(plane, false);
            planeDiv.classList.add('airplane-item');
            content.appendChild(planeDiv);
        }
    },

    async displayPlanets(planets) {
        const container = document.getElementById('planetObjects');
        const content = document.getElementById('planetContent');
        content.innerHTML = '';
        this.reveal(container);
        for (const planet of planets) {
            const planetDiv = await this.createObjectElement(planet, false);
            planetDiv.classList.add('planet-item');
            content.appendChild(planetDiv);
        }
    },

    async displayStars(stars) {
        const container = document.getElementById('starObjects');
        const content = document.getElementById('starContent');
        content.innerHTML = '';
        this.reveal(container);
        for (const star of stars) {
            const starDiv = await this.createObjectElement(star, false);
            starDiv.classList.add('star-item');
            content.appendChild(starDiv);
        }
    },
    
    /**
     * Display interesting celestial bodies
     * @param {Array} celestialBodies - Celestial body objects
     */
    displayCelestialBodies(celestialBodies) {
        const container = document.getElementById('celestialBodyObjects');
        const content = document.getElementById('celestialBodyContent');
        
        if (!container || !content) return;
        
        content.innerHTML = '';
        
        celestialBodies.forEach(body => {
            const bodyDiv = document.createElement('div');
            bodyDiv.className = 'object-item';
            
            // Object name
            const nameDiv = document.createElement('div');
            nameDiv.className = 'object-name';
            nameDiv.textContent = body.name;
            bodyDiv.appendChild(nameDiv);
            
            // Object type badge
            const typeSpan = document.createElement('span');
            typeSpan.className = 'object-type';
            typeSpan.textContent = body.bodyType?.toUpperCase() || 'CELESTIAL';
            bodyDiv.appendChild(typeSpan);
            
            // Object details
            const detailsDiv = document.createElement('div');
            detailsDiv.className = 'object-details';
            
            if (body.description) {
                this.addDetail(detailsDiv, 'Type', body.description);
            }
            
            // Show astronomical coordinates
            if (body.ra !== undefined && body.dec !== undefined) {
                this.addDetail(detailsDiv, 'RA', AstronomyUtils.formatRA(body.ra));
                this.addDetail(detailsDiv, 'Dec', AstronomyUtils.formatDec(body.dec));
            }
            
            if (body.altitude !== undefined) {
                this.addDetail(detailsDiv, 'Altitude', `${body.altitude.toFixed(1)}°`);
            }
            
            if (body.azimuth !== undefined) {
                this.addDetail(detailsDiv, 'Azimuth', `${body.azimuth.toFixed(1)}°`);
            }
            
            // Distance from zenith (angular distance)
            if (body.distanceFromZenith !== undefined) {
                this.addDetail(detailsDiv, 'Distance from zenith', `${body.distanceFromZenith.toFixed(1)}°`);
            }
            
            // Physical distance from Earth in human-readable format
            if (body.distance !== undefined) {
                const readableDistance = this.formatCelestialDistance(body.distance, body.distanceUnit || 'AU');
                this.addDetail(detailsDiv, 'Distance from Earth', readableDistance);
            }
            
            if (body.magnitude !== undefined) {
                this.addDetail(detailsDiv, 'Magnitude', body.magnitude.toFixed(2));
            }
            
            // Show additional data if available (for fallback bodies)
            if (body.meanRadius) {
                this.addDetail(detailsDiv, 'Radius', `${body.meanRadius.toLocaleString()} km`);
            }
            
            if (body.discoveryYear) {
                this.addDetail(detailsDiv, 'Discovered', body.discoveryYear);
            }
            
            if (body.moons && body.moons > 0) {
                this.addDetail(detailsDiv, 'Moons', body.moons);
            }
            
            if (body.density) {
                this.addDetail(detailsDiv, 'Density', `${body.density} g/cm³`);
            }
            
            bodyDiv.appendChild(detailsDiv);
            
            // Add fun fact if available
            if (body.funFact) {
                const factDiv = document.createElement('div');
                factDiv.className = 'fun-fact';
                factDiv.innerHTML = `💡 <em>${body.funFact}</em>`;
                bodyDiv.appendChild(factDiv);
            }
            
            content.appendChild(bodyDiv);
        });
        
        this.reveal(container);
    },

    /**
     * Create an object display element
     * @param {Object} obj - Object data
     * @param {boolean} isPrimary - Whether this is the primary zenith object
     * @returns {Promise<HTMLElement>} Object display element
     */
    async createObjectElement(obj, isPrimary = false) {
        const div = document.createElement('div');
        div.className = 'object-item';
        
        // Object name
        const nameDiv = document.createElement('div');
        nameDiv.className = 'object-name';
        nameDiv.textContent = obj.name;
        div.appendChild(nameDiv);
        
        // Object type badge
        const typeSpan = document.createElement('span');
        typeSpan.className = 'object-type';
        typeSpan.textContent = obj.type.toUpperCase();
        div.appendChild(typeSpan);
        
        // Fun fact for satellites and airplanes
        if ((obj.type === 'satellite' || obj.type === 'airplane') && typeof FactsFetcher !== 'undefined') {
            try {
                const funFact = await FactsFetcher.getFunFact(obj);
                if (funFact) {
                    const factDiv = document.createElement('div');
                    factDiv.className = 'fun-fact';
                    factDiv.innerHTML = `💡 <em>${funFact}</em>`;
                    div.appendChild(factDiv);
                }
            } catch (error) {
                console.warn('Failed to fetch fun fact:', error);
            }
        }
        
        // Object details
        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'object-details';
        
        // Airplane-specific details (simplified - no astronomical coordinates)
        if (obj.type === 'airplane') {
            if (obj.callsign) {
                this.addDetail(detailsDiv, 'Callsign', obj.callsign);
            }
            
            if (obj.icao24) {
                this.addDetail(detailsDiv, 'ICAO24', obj.icao24);
            }
            
            // Show route if available, otherwise show heading direction, then country
            if (obj.origin && obj.destination) {
                this.addDetail(detailsDiv, 'Route', `✈️ ${obj.origin} → ${obj.destination}`);
            } else if (obj.heading !== undefined && obj.heading !== null) {
                const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
                const dirIndex = Math.round(obj.heading / 45) % 8;
                const fullDirections = {
                    'N': 'North', 'NE': 'Northeast', 'E': 'East', 'SE': 'Southeast',
                    'S': 'South', 'SW': 'Southwest', 'W': 'West', 'NW': 'Northwest'
                };
                this.addDetail(detailsDiv, 'Flying', `Heading ${fullDirections[directions[dirIndex]]} (${obj.heading}°)`);
                if (obj.country) {
                    this.addDetail(detailsDiv, 'Registered', obj.country);
                }
            } else if (obj.country) {
                this.addDetail(detailsDiv, 'Registered', obj.country);
            }
            
            // Distance from user (horizontal distance)
            if (obj.distance) {
                this.addDetail(detailsDiv, 'Distance from you', `${obj.distance} km`);
            }
            
            if (obj.planeAltitude) {
                this.addDetail(detailsDiv, 'Flight Altitude', `${obj.planeAltitude} m (${Math.round(obj.planeAltitude * 3.28084)} ft)`);
            }
            
            if (obj.velocity) {
                this.addDetail(detailsDiv, 'Speed', `${obj.velocity} km/h`);
            }
        } else {
            // Non-airplane objects - show full astronomical data
            if (obj.ra !== undefined && obj.dec !== undefined) {
                this.addDetail(detailsDiv, 'RA', AstronomyUtils.formatRA(obj.ra));
                this.addDetail(detailsDiv, 'Dec', AstronomyUtils.formatDec(obj.dec));
            }
            
            if (obj.altitude !== undefined) {
                this.addDetail(detailsDiv, 'Altitude', `${obj.altitude.toFixed(1)}°`);
            }
            
            if (obj.azimuth !== undefined) {
                this.addDetail(detailsDiv, 'Azimuth', `${obj.azimuth.toFixed(1)}°`);
            }
            
            if (obj.distance !== undefined) {
                this.addDetail(detailsDiv, 'Distance from zenith', `${obj.distance}°`);
            }
            
            if (obj.magnitude !== undefined) {
                this.addDetail(detailsDiv, 'Magnitude', obj.magnitude.toFixed(2));
            }
            
            if (obj.constellation) {
                this.addDetail(detailsDiv, 'Constellation', obj.constellation);
            }
            
            if (obj.range) {
                this.addDetail(detailsDiv, 'Range', `${obj.range} km`);
            }
        }
        
        div.appendChild(detailsDiv);
        
        return div;
    },
    
    /**
     * Add a detail item to details container
     * @param {HTMLElement} container - Container element
     * @param {string} label - Detail label
     * @param {string} value - Detail value
     */
    addDetail(container, label, value) {
        const detail = document.createElement('div');
        detail.className = 'object-detail-item';
        detail.innerHTML = `<strong>${label}:</strong> ${value}`;
        container.appendChild(detail);
    },
    
    /**
     * Format celestial distance in human-readable units
     * @param {number} distance - Distance value
     * @param {string} unit - Original unit (AU, km, etc.)
     * @returns {string} - Formatted distance string
     */
    formatCelestialDistance(distance, unit) {
        const AU_TO_KM = 149597870.7; // 1 AU in kilometers
        const LIGHT_SPEED_KM_PER_MIN = 17987547.48; // Speed of light in km/min
        const LIGHT_SPEED_KM_PER_HOUR = LIGHT_SPEED_KM_PER_MIN * 60;
        
        let distanceInKm = distance;
        
        // Convert to kilometers if needed
        if (unit === 'AU') {
            distanceInKm = distance * AU_TO_KM;
        }
        
        // For very close objects (< 1 light-minute), use kilometers
        if (distanceInKm < LIGHT_SPEED_KM_PER_MIN) {
            return `${distanceInKm.toLocaleString(undefined, { maximumFractionDigits: 0 })} km`;
        }
        
        // For objects within 2 hours light-travel time, use light-minutes
        if (distanceInKm < LIGHT_SPEED_KM_PER_HOUR * 2) {
            const lightMinutes = distanceInKm / LIGHT_SPEED_KM_PER_MIN;
            return `${lightMinutes.toFixed(1)} light-minutes`;
        }
        
        // For objects within 48 hours, use light-hours
        if (distanceInKm < LIGHT_SPEED_KM_PER_HOUR * 48) {
            const lightHours = distanceInKm / LIGHT_SPEED_KM_PER_HOUR;
            return `${lightHours.toFixed(1)} light-hours`;
        }
        
        // For distant objects, use AU
        const au = distanceInKm / AU_TO_KM;
        return `${au.toFixed(2)} AU (${(au * 8.32).toFixed(1)} light-minutes)`;
    },
    
    /**
     * Reset the display
     */
    reset() {
        document.getElementById('locationInfo').classList.add('hidden');
        document.getElementById('celestialInfo').classList.add('hidden');
        document.getElementById('resultsSection').classList.add('hidden');
        document.getElementById('refreshSection').classList.add('hidden');
        document.getElementById('noResults').classList.add('hidden');
        this.clearError();
        this.hideLoading();
    }
};
