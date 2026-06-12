module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const queryParams = new URLSearchParams(req.query);
        const url = `https://opensky-network.org/api/states/all?${queryParams}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`OpenSky error: ${response.status}`);
        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch from OpenSky', message: error.message });
    }
};
