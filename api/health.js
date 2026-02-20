module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    status: 'ok',
    message: 'StarBot API is running on Vercel',
    timestamp: new Date().toISOString(),
  });
}
