const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

console.log('🚀 StarBot Backend Server Starting...');

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'StarBot Backend Server is running',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/horizons', async (req, res) => {
    try {
        const queryParams = new URLSearchParams(req.query);
        const url = `https://ssd.jpl.nasa.gov/api/horizons.api?${queryParams}`;
        
        console.log(`📡 Proxying Horizons request for body: ${req.query.COMMAND || 'unknown'}`);
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(`Horizons API error: ${response.status}`);
        }
        
        res.json(data);
    } catch (error) {
        console.error('❌ Horizons API Error:', error.message);
        res.status(500).json({ 
            error: 'Failed to fetch from Horizons API',
            message: error.message 
        });
    }
});

app.post('/api/openai', async (req, res) => {
    try {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY not configured');
        }
        
        console.log('🤖 Proxying OpenAI request');
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify(req.body)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status} - ${data.error?.message || 'Unknown error'}`);
        }
        
        res.json(data);
    } catch (error) {
        console.error('❌ OpenAI API Error:', error.message);
        res.status(500).json({ 
            error: 'Failed to fetch from OpenAI API',
            message: error.message 
        });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log('📡 Endpoints: /api/health, /api/horizons, /api/serp, /api/openai');
});
