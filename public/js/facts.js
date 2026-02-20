// AI-Powered Fun Facts Fetcher using OpenAI
const FactsFetcher = {
    cache: new Map(),
    enabled: true,
    
    /**
     * Get an interesting fun fact about a celestial object
     * @param {Object} obj - The object (satellite, airplane, or celestial body)
     * @returns {Promise<string>} - A 2-line interesting fact
     */
    async getFunFact(obj) {
        // If disabled, return fallback immediately
        if (!this.enabled) {
            return this.getFallbackFact(obj);
        }
        
        // Check cache first
        const cacheKey = this.getCacheKey(obj);
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        try {
            // Add timeout to prevent hanging
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), 10000) // 10 second timeout
            );
            
            let factPromise;
            
            if (obj.type === 'satellite') {
                factPromise = this.fetchAIFact(obj.name, 'satellite');
            } else if (obj.type === 'airplane') {
                const query = obj.callsign || obj.icao24 || 'airplane';
                const country = obj.country || '';
                factPromise = this.fetchAIFact(`${query} aircraft from ${country}`, 'airplane');
            } else if (obj.type === 'celestial_body') {
                factPromise = this.fetchAIFact(obj.name, 'celestial body');
            } else {
                return null;
            }
            
            // Race between fact fetch and timeout
            const fact = await Promise.race([factPromise, timeoutPromise]);
            
            // Cache the result
            this.cache.set(cacheKey, fact);
            return fact;
            
        } catch (error) {
            console.warn('Error fetching AI fact:', error.message);
            const fallback = this.getFallbackFact(obj);
            this.cache.set(cacheKey, fallback);
            return fallback;
        }
    },
    
    /**
     * Fetch an AI-generated fact using OpenAI GPT
     * @param {string} name - Name of the object
     * @param {string} type - Type of object (satellite, airplane, celestial body)
     * @returns {Promise<string>} - Generated fact
     */
    async fetchAIFact(name, type) {
        try {
            const fact = await this.generateFactWithOpenAI(name, type, '');
            return fact;
        } catch (error) {
            console.error(`Error generating AI fact for ${name}:`, error);
            throw error;
        }
    },
    
    /**
     * Generate a fact using OpenAI GPT
     * @param {string} name - Name of the object
     * @param {string} type - Type of object
     * @param {string} context - Context from search results
     * @returns {Promise<string>} - Generated fact
     */
    async generateFactWithOpenAI(name, type, context) {
        try {
            // Determine if we should mention location (for celestial bodies)
            const isSpaceObject = type.includes('dwarf planet') || type.includes('asteroid') || 
                                 type.includes('planet') || type.includes('star') || type.includes('celestial');
            
            let locationContext = '';
            if (isSpaceObject) {
                locationContext = '\n- Mention viewing it from Bangalore, India if relevant to the fact';
            }
            
            // Create prompt based on whether we have search context
            let prompt;
            if (context && context.trim().length > 0) {
                prompt = `Based on the following information about ${name} (${type}):

${context}

Generate exactly 2 lines of the most interesting and surprising fact about ${name}. The fact should be:
- Fascinating. weird and not commonly known
- Accurate and based on real information
- Written in an engaging, conversational tone
- Maximum 2 sentences
- No introductory phrases like "Did you know" or "Interestingly"${locationContext}

Just provide the 2-line fact, nothing else.`;
            } else {
                // No search context - generate from knowledge base
                prompt = `Generate exactly 2 lines of the most interesting and surprising fact about ${name} (${type}). The fact should be:
- Fascinating, weird and and not commonly known
- Accurate and based on your knowledge
- Written in an engaging, conversational tone
- Maximum 2 sentences
- No introductory phrases like "Did you know" or "Interestingly"${locationContext}

Just provide the 2-line fact, nothing else.`;
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

            const requestBody = {
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert at creating fascinating, accurate facts about space objects, satellites, aircraft, and celestial bodies. You provide concise, interesting information in exactly 2 lines. When relevant, you personalize facts to the viewer\'s location.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 100,
                temperature: 0.7
            };

            let response;
            
            if (CONFIG.USE_BACKEND) {
                // Use backend proxy
                response = await fetch(`${CONFIG.BACKEND_URL}/openai`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody),
                    signal: controller.signal
                });
            } else {
                // Direct API call (CORS will block in browsers)
                response = await fetch(CONFIG.OPENAI_API, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}`
                    },
                    body: JSON.stringify(requestBody),
                    signal: controller.signal
                });
            }
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(`OpenAI API error: ${response.status} - ${JSON.stringify(errorData)}`);
            }
            
            const data = await response.json();
            const fact = data.choices[0].message.content.trim();
            
            return fact;
            
        } catch (error) {
            console.warn('OpenAI API call failed:', error.message);
            throw error;
        }
    },
    
    /**
     * Get a cache key for an object
     * @param {Object} obj - The object
     * @returns {string} - Cache key
     */
    getCacheKey(obj) {
        if (obj.type === 'satellite') {
            return `sat_${obj.name}`;
        } else if (obj.type === 'airplane') {
            return `plane_${obj.callsign || obj.icao24}`;
        } else if (obj.type === 'celestial_body') {
            return `celestial_${obj.name}`;
        }
        return `obj_${obj.name}`;
    },
    
    /**
     * Get a fallback fact if AI generation fails
     * @param {Object} obj - The object
     * @returns {string} - Fallback fact
     */
    getFallbackFact(obj) {
        if (obj.type === 'satellite') {
            const fallbacks = [
                'This satellite orbits Earth multiple times per day, traveling at speeds over 27,000 km/h.',
                'Satellites like this help us with GPS navigation, weather forecasting, and global communications.',
                'This satellite is one of thousands orbiting Earth, forming a network in the sky above us.'
            ];
            return fallbacks[Math.floor(Math.random() * fallbacks.length)];
        } else if (obj.type === 'airplane') {
            return 'This aircraft is cruising at high altitude, connecting people and places across the globe.';
        } else if (obj.type === 'celestial_body') {
            return `${obj.name} is one of the fascinating objects in our solar system, with unique characteristics.`;
        }
        return 'An interesting celestial object worth learning more about!';
    },
    
    /**
     * Clear the cache
     */
    clearCache() {
        this.cache.clear();
    }
};
