const CONFIG = {
    N2YO_API_KEY: '57EM7E-P9VJ8E-7VB2R5-5LAH',
    
    USE_BACKEND: true,
    BACKEND_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:3001/api' 
        : 'https://starbot-backend.onrender.com/api',
    
    HORIZONS_API: 'https://ssd.jpl.nasa.gov/api/horizons.api',
    CELESTRAK_API: 'https://celestrak.org/NORAD/elements/gp.php',
    N2YO_API: 'https://api.n2yo.com/rest/v1/satellite',
    OPENSKY_API: 'https://opensky-network.org/api/states/all',
    AVIATIONSTACK_API: 'http://api.aviationstack.com/v1/flights',
    AVIATIONSTACK_KEY: '818f1c083822335529fd203e2ab9bb10',
    WIKIPEDIA_API: 'https://en.wikipedia.org/w/api.php',
    MINOR_PLANET_API: 'https://api.le-systeme-solaire.net/rest/bodies/',
    
    OPENAI_API_KEY: '',
    OPENAI_API: 'https://api.openai.com/v1/chat/completions',
    SERPAPI_KEY: '',
    SERPAPI_SEARCH: 'https://serpapi.com/search',
    
    ZENITH_TOLERANCE: 5,
    NEARBY_TOLERANCE: 10,
    
    SATELLITE_GROUPS: [
        'stations',
        'visual',
        'starlink',
        'iridium-NEXT',
        'galileo',
        'gps-ops'
    ],
    
    SOLAR_SYSTEM_BODIES: [
        { id: '10', name: 'Sun' },
        { id: '301', name: 'Moon' },
        { id: '199', name: 'Mercury' },
        { id: '299', name: 'Venus' },
        { id: '499', name: 'Mars' },
        { id: '599', name: 'Jupiter' },
        { id: '699', name: 'Saturn' },
        { id: '799', name: 'Uranus' },
        { id: '899', name: 'Neptune' }
    ],
    
    BRIGHT_STARS: [
        { name: 'Sirius', ra: 6.7525, dec: -16.7161, mag: -1.46, constellation: 'Canis Major', spectralType: 'A1V' },
        { name: 'Canopus', ra: 6.3992, dec: -52.6956, mag: -0.74, constellation: 'Carina', spectralType: 'A9II' },
        { name: 'Alpha Centauri A', ra: 14.6599, dec: -60.8350, mag: -0.27, constellation: 'Centaurus', spectralType: 'G2V' },
        { name: 'Arcturus', ra: 14.2610, dec: 19.1825, mag: -0.05, constellation: 'Boötes', spectralType: 'K1.5III' },
        
        // Magnitude 0 to 0.5
        { name: 'Vega', ra: 18.6156, dec: 38.7836, mag: 0.03, constellation: 'Lyra', spectralType: 'A0V' },
        { name: 'Capella', ra: 5.2781, dec: 45.9980, mag: 0.08, constellation: 'Auriga', spectralType: 'G5III' },
        { name: 'Rigel', ra: 5.2423, dec: -8.2017, mag: 0.13, constellation: 'Orion', spectralType: 'B8Ia' },
        { name: 'Procyon', ra: 7.6553, dec: 5.2247, mag: 0.34, constellation: 'Canis Minor', spectralType: 'F5IV' },
        { name: 'Achernar', ra: 1.6285, dec: -57.2367, mag: 0.46, constellation: 'Eridanus', spectralType: 'B3Vpe' },
        { name: 'Betelgeuse', ra: 5.9195, dec: 7.4070, mag: 0.50, constellation: 'Orion', spectralType: 'M2Iab' },
        
        // Magnitude 0.5 to 1.0
        { name: 'Hadar', ra: 14.0637, dec: -60.3730, mag: 0.61, constellation: 'Centaurus', spectralType: 'B1III' },
        { name: 'Altair', ra: 19.8464, dec: 8.8683, mag: 0.76, constellation: 'Aquila', spectralType: 'A7V' },
        { name: 'Acrux', ra: 12.4433, dec: -63.0990, mag: 0.77, constellation: 'Crux', spectralType: 'B0.5IV' },
        { name: 'Aldebaran', ra: 4.5987, dec: 16.5093, mag: 0.85, constellation: 'Taurus', spectralType: 'K5III' },
        { name: 'Spica', ra: 13.4199, dec: -11.1613, mag: 0.98, constellation: 'Virgo', spectralType: 'B1V' },
        
        // Magnitude 1.0 to 1.5
        { name: 'Antares', ra: 16.4901, dec: -26.4320, mag: 1.06, constellation: 'Scorpius', spectralType: 'M1Ib' },
        { name: 'Pollux', ra: 7.7553, dec: 28.0262, mag: 1.14, constellation: 'Gemini', spectralType: 'K0III' },
        { name: 'Fomalhaut', ra: 22.9608, dec: -29.6222, mag: 1.16, constellation: 'Piscis Austrinus', spectralType: 'A3V' },
        { name: 'Deneb', ra: 20.6906, dec: 45.2803, mag: 1.25, constellation: 'Cygnus', spectralType: 'A2Ia' },
        { name: 'Mimosa', ra: 12.7953, dec: -59.6889, mag: 1.25, constellation: 'Crux', spectralType: 'B0.5III' },
        { name: 'Regulus', ra: 10.1395, dec: 11.9672, mag: 1.35, constellation: 'Leo', spectralType: 'B7V' },
        { name: 'Adhara', ra: 6.9771, dec: -28.9720, mag: 1.50, constellation: 'Canis Major', spectralType: 'B2II' },
        
        // Magnitude 1.5 to 2.0
        { name: 'Castor', ra: 7.5766, dec: 31.8883, mag: 1.58, constellation: 'Gemini', spectralType: 'A1V' },
        { name: 'Gacrux', ra: 12.5194, dec: -57.1131, mag: 1.63, constellation: 'Crux', spectralType: 'M3.5III' },
        { name: 'Bellatrix', ra: 5.4188, dec: 6.3497, mag: 1.64, constellation: 'Orion', spectralType: 'B2III' },
        { name: 'Shaula', ra: 17.5603, dec: -37.1038, mag: 1.63, constellation: 'Scorpius', spectralType: 'B1.5IV' },
        { name: 'Elnath', ra: 5.4381, dec: 28.6075, mag: 1.65, constellation: 'Taurus', spectralType: 'B7III' },
        { name: 'Miaplacidus', ra: 9.2200, dec: -69.7172, mag: 1.68, constellation: 'Carina', spectralType: 'A1III' },
        { name: 'Alnilam', ra: 5.6036, dec: -1.2019, mag: 1.69, constellation: 'Orion', spectralType: 'B0Ia' },
        { name: 'Regor', ra: 8.1583, dec: -47.3367, mag: 1.74, constellation: 'Vela', spectralType: 'WC8' },
        { name: 'Alnair', ra: 22.1372, dec: -46.9611, mag: 1.74, constellation: 'Grus', spectralType: 'B7IV' },
        { name: 'Alioth', ra: 12.9004, dec: 55.9598, mag: 1.76, constellation: 'Ursa Major', spectralType: 'A0p' },
        { name: 'Alnitak', ra: 5.6794, dec: -1.9425, mag: 1.77, constellation: 'Orion', spectralType: 'O9Ib' },
        { name: 'Dubhe', ra: 11.0621, dec: 61.7509, mag: 1.79, constellation: 'Ursa Major', spectralType: 'K0III' },
        { name: 'Mirfak', ra: 3.4054, dec: 49.8612, mag: 1.79, constellation: 'Perseus', spectralType: 'F5Ib' },
        { name: 'Wezen', ra: 7.1397, dec: -26.3932, mag: 1.84, constellation: 'Canis Major', spectralType: 'F8Ia' },
        { name: 'Sargas', ra: 17.6223, dec: -42.9978, mag: 1.87, constellation: 'Scorpius', spectralType: 'F1II' },
        { name: 'Kaus Australis', ra: 18.4028, dec: -34.3846, mag: 1.85, constellation: 'Sagittarius', spectralType: 'B9.5III' },
        { name: 'Avior', ra: 8.3753, dec: -59.5097, mag: 1.86, constellation: 'Carina', spectralType: 'K3II' },
        { name: 'Alkaid', ra: 13.7923, dec: 49.3133, mag: 1.86, constellation: 'Ursa Major', spectralType: 'B3V' },
        { name: 'Menkalinan', ra: 5.9925, dec: 44.9475, mag: 1.90, constellation: 'Auriga', spectralType: 'A2IV' },
        { name: 'Atria', ra: 16.8110, dec: -69.0278, mag: 1.92, constellation: 'Triangulum Australe', spectralType: 'K2IIb-IIIa' },
        { name: 'Alhena', ra: 6.6283, dec: 16.3994, mag: 1.93, constellation: 'Gemini', spectralType: 'A0IV' },
        { name: 'Peacock', ra: 20.4274, dec: -56.7350, mag: 1.94, constellation: 'Pavo', spectralType: 'B2IV' },
        { name: 'Alsephina', ra: 2.0970, dec: -51.5164, mag: 1.95, constellation: 'Hydrus', spectralType: 'A1V' },
        { name: 'Polaris', ra: 2.5301, dec: 89.2641, mag: 1.98, constellation: 'Ursa Minor', spectralType: 'F7Ib' },
        
        // Magnitude 2.0 to 2.5
        { name: 'Mirzam', ra: 6.3783, dec: -17.9559, mag: 2.00, constellation: 'Canis Major', spectralType: 'B1II-III' },
        { name: 'Alphard', ra: 9.4597, dec: -8.6586, mag: 2.00, constellation: 'Hydra', spectralType: 'K3II-III' },
        { name: 'Hamal', ra: 2.1196, dec: 23.4624, mag: 2.00, constellation: 'Aries', spectralType: 'K2III' },
        { name: 'Nunki', ra: 18.9210, dec: -26.2967, mag: 2.02, constellation: 'Sagittarius', spectralType: 'B2.5V' },
        { name: 'Diphda', ra: 0.7265, dec: -17.9867, mag: 2.04, constellation: 'Cetus', spectralType: 'K0III' },
        { name: 'Mizar', ra: 13.3988, dec: 54.9254, mag: 2.04, constellation: 'Ursa Major', spectralType: 'A2V' },
        { name: 'Kochab', ra: 14.8451, dec: 74.1555, mag: 2.08, constellation: 'Ursa Minor', spectralType: 'K4III' },
        { name: 'Saiph', ra: 5.7959, dec: -9.6697, mag: 2.09, constellation: 'Orion', spectralType: 'B0.5Ia' },
        { name: 'Alpheratz', ra: 0.1398, dec: 29.0905, mag: 2.06, constellation: 'Andromeda', spectralType: 'A0p' },
        { name: 'Rasalhague', ra: 17.5822, dec: 12.5600, mag: 2.08, constellation: 'Ophiuchus', spectralType: 'A5III' },
        { name: 'Algol', ra: 3.1362, dec: 40.9557, mag: 2.12, constellation: 'Perseus', spectralType: 'B8V' },
        { name: 'Denebola', ra: 11.8177, dec: 14.5721, mag: 2.14, constellation: 'Leo', spectralType: 'A3V' },
        { name: 'Schedar', ra: 0.6751, dec: 56.5373, mag: 2.23, constellation: 'Cassiopeia', spectralType: 'K0III' },
        { name: 'Naos', ra: 8.0596, dec: -40.0031, mag: 2.25, constellation: 'Puppis', spectralType: 'O5Ia' },
        { name: 'Izar', ra: 14.7499, dec: 27.0742, mag: 2.37, constellation: 'Boötes', spectralType: 'K0II-III' },
        { name: 'Enif', ra: 21.7364, dec: 9.8750, mag: 2.39, constellation: 'Pegasus', spectralType: 'K2Ib' },
        { name: 'Scheat', ra: 23.0628, dec: 28.0828, mag: 2.42, constellation: 'Pegasus', spectralType: 'M2.5II-III' },
        { name: 'Sabik', ra: 17.1730, dec: -15.7249, mag: 2.43, constellation: 'Ophiuchus', spectralType: 'A2.5IV' },
        { name: 'Phecda', ra: 11.8971, dec: 53.6948, mag: 2.44, constellation: 'Ursa Major', spectralType: 'A0V' },
        { name: 'Alderamin', ra: 21.3099, dec: 62.5855, mag: 2.44, constellation: 'Cepheus', spectralType: 'A7IV-V' },
        { name: 'Aludra', ra: 7.4014, dec: -29.3031, mag: 2.45, constellation: 'Canis Major', spectralType: 'B5Ia' },
        { name: 'Markab', ra: 23.0794, dec: 15.2053, mag: 2.49, constellation: 'Pegasus', spectralType: 'B9III' },
        
        // Magnitude 2.5 to 3.0 (Selected bright stars)
        { name: 'Menkar', ra: 3.0379, dec: 4.0897, mag: 2.53, constellation: 'Cetus', spectralType: 'M1.5III' },
        { name: 'Zubenelgenubi', ra: 14.8479, dec: -16.0417, mag: 2.75, constellation: 'Libra', spectralType: 'A3IV' },
        { name: 'Acrab', ra: 16.8359, dec: -19.8058, mag: 2.56, constellation: 'Scorpius', spectralType: 'B0.5V' },
        { name: 'Ankaa', ra: 0.4381, dec: -42.3061, mag: 2.39, constellation: 'Phoenix', spectralType: 'K0III' },
        { name: 'Merak', ra: 11.0307, dec: 56.3824, mag: 2.37, constellation: 'Ursa Major', spectralType: 'A1V' },
        { name: 'Eltanin', ra: 17.9434, dec: 51.4889, mag: 2.23, constellation: 'Draco', spectralType: 'K5III' },
        { name: 'Menkalinen', ra: 5.9925, dec: 44.9475, mag: 2.62, constellation: 'Auriga', spectralType: 'A1V' },
        { name: 'Caph', ra: 0.1527, dec: 59.1497, mag: 2.27, constellation: 'Cassiopeia', spectralType: 'F2III-IV' },
        { name: 'Gienah', ra: 12.2634, dec: -17.5419, mag: 2.59, constellation: 'Corvus', spectralType: 'B8III' },
        { name: 'Muhlifain', ra: 12.6947, dec: -48.9596, mag: 2.69, constellation: 'Centaurus', spectralType: 'A2IV' },
        { name: 'Aspidiske', ra: 9.2850, dec: -59.2754, mag: 2.76, constellation: 'Carina', spectralType: 'A8Ib' },
        { name: 'Dschubba', ra: 16.0059, dec: -22.6217, mag: 2.29, constellation: 'Scorpius', spectralType: 'B0.3IV' },
        { name: 'Kaus Media', ra: 18.3493, dec: -29.8281, mag: 2.70, constellation: 'Sagittarius', spectralType: 'K2III' },
        { name: 'Algieba', ra: 10.3328, dec: 19.8415, mag: 2.61, constellation: 'Leo', spectralType: 'K0III' },
        { name: 'Zosma', ra: 11.2358, dec: 20.5236, mag: 2.56, constellation: 'Leo', spectralType: 'A4V' },
        { name: 'Thuban', ra: 14.0733, dec: 64.3756, mag: 3.65, constellation: 'Draco', spectralType: 'A0III' },
        { name: 'Alphecca', ra: 15.5781, dec: 26.7147, mag: 2.23, constellation: 'Corona Borealis', spectralType: 'A0V' },
        { name: 'Unukalhai', ra: 15.7378, dec: 6.4256, mag: 2.63, constellation: 'Serpens', spectralType: 'K2III' },
        { name: 'Rasalgethi', ra: 17.2446, dec: 14.3903, mag: 3.48, constellation: 'Hercules', spectralType: 'M5Ib-II' },
        { name: 'Albireo', ra: 19.5125, dec: 27.9597, mag: 3.18, constellation: 'Cygnus', spectralType: 'K3II' },
        { name: 'Tarazed', ra: 19.7709, dec: 10.6133, mag: 2.72, constellation: 'Aquila', spectralType: 'K3II' },
        { name: 'Sadalmelik', ra: 22.0964, dec: -0.3199, mag: 2.96, constellation: 'Aquarius', spectralType: 'G2Ib' },
        { name: 'Sadalsuud', ra: 21.5256, dec: -5.5711, mag: 2.87, constellation: 'Aquarius', spectralType: 'G0Ib' }
    ],
    
    CACHE_DURATION: 300000,
    MAX_NEARBY_OBJECTS: 10,
    MAX_SATELLITES_DISPLAY: 15,
    MAX_AIRPLANES_DISPLAY: 20,
    MIN_AIRPLANE_ALTITUDE: 1000,
    MAX_AIRPLANE_ALTITUDE: 15000
};
