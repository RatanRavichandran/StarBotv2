// Astronomy calculation utilities
const AstronomyUtils = {
    /**
     * Convert Date to Julian Date
     * @param {Date} date - JavaScript Date object
     * @returns {number} Julian Date
     */
    dateToJulianDate(date) {
        const time = date.getTime();
        const tzOffset = date.getTimezoneOffset();
        return (time / 86400000) - (tzOffset / 1440) + 2440587.5;
    },
    
    /**
     * Calculate Greenwich Mean Sidereal Time (GMST)
     * @param {Date} date - JavaScript Date object
     * @returns {number} GMST in hours (0-24)
     */
    calculateGMST(date) {
        const jd = this.dateToJulianDate(date);
        const t = (jd - 2451545.0) / 36525.0;
        
        // GMST at 0h UT
        let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 
                   0.000387933 * t * t - (t * t * t) / 38710000.0;
        
        // Normalize to 0-360
        gmst = gmst % 360;
        if (gmst < 0) gmst += 360;
        
        // Convert to hours
        return gmst / 15.0;
    },
    
    /**
     * Calculate Local Sidereal Time (LST)
     * @param {Date} date - JavaScript Date object
     * @param {number} longitude - Observer's longitude in degrees (East positive)
     * @returns {number} LST in hours (0-24)
     */
    calculateLST(date, longitude) {
        const gmst = this.calculateGMST(date);
        let lst = gmst + (longitude / 15.0);
        
        // Normalize to 0-24
        lst = lst % 24;
        if (lst < 0) lst += 24;
        
        return lst;
    },
    
    /**
     * Convert geographic coordinates to celestial coordinates at zenith
     * @param {number} latitude - Observer's latitude in degrees
     * @param {number} longitude - Observer's longitude in degrees
     * @param {Date} date - JavaScript Date object (defaults to now)
     * @returns {Object} { ra, dec, lst } in hours and degrees
     */
    geographicToZenithCelestial(latitude, longitude, date = new Date()) {
        const lst = this.calculateLST(date, longitude);
        
        return {
            ra: lst, // Right Ascension at zenith equals LST
            dec: latitude, // Declination at zenith equals latitude
            lst: lst,
            jd: this.dateToJulianDate(date)
        };
    },
    
    /**
     * Calculate angular distance between two celestial coordinates
     * @param {number} ra1 - Right Ascension 1 in hours
     * @param {number} dec1 - Declination 1 in degrees
     * @param {number} ra2 - Right Ascension 2 in hours
     * @param {number} dec2 - Declination 2 in degrees
     * @returns {number} Angular distance in degrees
     */
    angularDistance(ra1, dec1, ra2, dec2) {
        // Convert to radians
        const ra1Rad = (ra1 * 15) * Math.PI / 180;
        const dec1Rad = dec1 * Math.PI / 180;
        const ra2Rad = (ra2 * 15) * Math.PI / 180;
        const dec2Rad = dec2 * Math.PI / 180;
        
        // Haversine formula
        const dRA = ra2Rad - ra1Rad;
        const dDec = dec2Rad - dec1Rad;
        
        const a = Math.sin(dDec / 2) ** 2 + 
                  Math.cos(dec1Rad) * Math.cos(dec2Rad) * Math.sin(dRA / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        
        // Convert to degrees
        return c * 180 / Math.PI;
    },
    
    /**
     * Convert altitude/azimuth to RA/Dec
     * @param {number} altitude - Altitude in degrees (0-90)
     * @param {number} azimuth - Azimuth in degrees (0-360, North=0)
     * @param {number} latitude - Observer's latitude in degrees
     * @param {number} longitude - Observer's longitude in degrees
     * @param {Date} date - JavaScript Date object
     * @returns {Object} { ra, dec } in hours and degrees
     */
    altAzToRADec(altitude, azimuth, latitude, longitude, date = new Date()) {
        const lst = this.calculateLST(date, longitude);
        
        // Convert to radians
        const altRad = altitude * Math.PI / 180;
        const azRad = azimuth * Math.PI / 180;
        const latRad = latitude * Math.PI / 180;
        
        // Calculate declination
        const decRad = Math.asin(
            Math.sin(altRad) * Math.sin(latRad) + 
            Math.cos(altRad) * Math.cos(latRad) * Math.cos(azRad)
        );
        
        // Calculate hour angle
        const haRad = Math.atan2(
            -Math.cos(altRad) * Math.cos(latRad) * Math.sin(azRad),
            Math.sin(altRad) - Math.sin(latRad) * Math.sin(decRad)
        );
        
        // Convert to degrees
        const dec = decRad * 180 / Math.PI;
        let ha = haRad * 180 / Math.PI;
        
        // Convert hour angle to RA
        let ra = lst - (ha / 15);
        
        // Normalize RA to 0-24
        ra = ra % 24;
        if (ra < 0) ra += 24;
        
        return { ra, dec };
    },
    
    /**
     * Convert RA/Dec to Altitude/Azimuth
     * @param {number} ra - Right Ascension in hours
     * @param {number} dec - Declination in degrees
     * @param {number} latitude - Observer's latitude in degrees
     * @param {number} longitude - Observer's longitude in degrees
     * @param {Date} date - JavaScript Date object
     * @returns {Object} { altitude, azimuth } in degrees
     */
    raDecToAltAz(ra, dec, latitude, longitude, date = new Date()) {
        const lst = this.calculateLST(date, longitude);
        
        // Calculate hour angle
        let ha = lst - ra;
        
        // Convert to radians
        const haRad = (ha * 15) * Math.PI / 180;
        const decRad = dec * Math.PI / 180;
        const latRad = latitude * Math.PI / 180;
        
        // Calculate altitude
        const altRad = Math.asin(
            Math.sin(decRad) * Math.sin(latRad) + 
            Math.cos(decRad) * Math.cos(latRad) * Math.cos(haRad)
        );
        
        // Calculate azimuth
        const azRad = Math.atan2(
            -Math.cos(decRad) * Math.cos(latRad) * Math.sin(haRad),
            Math.sin(decRad) - Math.sin(latRad) * Math.sin(altRad)
        );
        
        // Convert to degrees
        let altitude = altRad * 180 / Math.PI;
        let azimuth = azRad * 180 / Math.PI;
        
        // Normalize azimuth to 0-360
        azimuth = azimuth % 360;
        if (azimuth < 0) azimuth += 360;
        
        return { altitude, azimuth };
    },
    
    /**
     * Format RA in hours, minutes, seconds
     * @param {number} raHours - RA in decimal hours
     * @returns {string} Formatted RA string
     */
    formatRA(raHours) {
        const hours = Math.floor(raHours);
        const minutes = Math.floor((raHours - hours) * 60);
        const seconds = Math.floor(((raHours - hours) * 60 - minutes) * 60);
        return `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
    },
    
    /**
     * Format Dec in degrees, arcminutes, arcseconds
     * @param {number} decDegrees - Dec in decimal degrees
     * @returns {string} Formatted Dec string
     */
    formatDec(decDegrees) {
        const sign = decDegrees >= 0 ? '+' : '-';
        const absDec = Math.abs(decDegrees);
        const degrees = Math.floor(absDec);
        const arcminutes = Math.floor((absDec - degrees) * 60);
        const arcseconds = Math.floor(((absDec - degrees) * 60 - arcminutes) * 60);
        return `${sign}${degrees.toString().padStart(2, '0')}° ${arcminutes.toString().padStart(2, '0')}' ${arcseconds.toString().padStart(2, '0')}"`;
    },
    
    /**
     * Format LST
     * @param {number} lstHours - LST in decimal hours
     * @returns {string} Formatted LST string
     */
    formatLST(lstHours) {
        return this.formatRA(lstHours);
    },
    
    /**
     * Check if an object is above the horizon
     * @param {number} altitude - Altitude in degrees
     * @returns {boolean} True if above horizon
     */
    isAboveHorizon(altitude) {
        return altitude > 0;
    },
    
    /**
     * Check if an object is near zenith
     * @param {number} altitude - Altitude in degrees
     * @param {number} tolerance - Tolerance in degrees (default 10)
     * @returns {boolean} True if near zenith
     */
    isNearZenith(altitude, tolerance = 10) {
        return altitude >= (90 - tolerance);
    }
};
