module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!process.env.SERPAPI_KEY) {
      return res.status(500).json({ error: 'SERPAPI_KEY not configured' });
    }

    const params = new URLSearchParams(req.query);
    params.set('api_key', process.env.SERPAPI_KEY);

    const response = await fetch(`https://serpapi.com/search?${params}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`SerpAPI error: ${response.status} - ${data.error || 'Unknown error'}`);
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('SerpAPI Error:', error.message);
    res.status(500).json({
      error: 'Failed to fetch from SerpAPI',
      message: error.message,
    });
  }
};
