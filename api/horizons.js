export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const queryParams = new URLSearchParams(req.query);
    const url = `https://ssd.jpl.nasa.gov/api/horizons.api?${queryParams}`;

    console.log(`Proxying Horizons request for body: ${req.query.COMMAND || 'unknown'}`);

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Horizons API error: ${response.status}`);
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('Horizons API Error:', error.message);
    res.status(500).json({
      error: 'Failed to fetch from Horizons API',
      message: error.message,
    });
  }
}
