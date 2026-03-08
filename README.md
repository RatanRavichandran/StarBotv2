**what you probably cant see when you look up**

A real-time sky object detector with animated starry background. Discover airplanes, satellites, planets, stars, and celestial bodies directly overhead your location.

## 🚀 Live Demo

**Frontend:** https://ratanravichandran.github.io/StarBot/  
**Backend:** https://starbot-backend.onrender.com

## ✨ Features

- 🌌 Animated starry night background with glass-morphism effects
- ✈️ Real-time airplane tracking with flight routes
- 🛰️ Satellite positions (ISS, Starlink, GPS, etc.)
- 🪐 Solar system objects (planets, moon, sun)
- ⭐ Bright star catalog (100+ stars)
- 🤖 AI-generated facts about celestial objects (powered by OpenAI)
- 🗺️ Interactive map view for airplanes

## 🛠️ Tech Stack

- **Frontend:** Vanilla JavaScript, CSS3 animations, Glass-morphism design
- **Backend:** Node.js, Express (CORS proxy)
- **APIs:** NASA Horizons, OpenSky Network, CelesTrak, OpenAI, SerpAPI (optional)
- **Hosting:** GitHub Pages (frontend), Render (backend - free tier)

## � Local Development

```bash
# Install dependencies
npm install

# Start backend server
npm start

# Open in browser
http://localhost:3001
```

## 🔑 Environment Variables

Create a `.env` file:

```env
PORT=3001
OPENAI_API_KEY=your_key_here
SERPAPI_KEY=your_key_here
NODE_ENV=development
```

## � Project Structure

```
StarBot/
├── js/
│   ├── api.js           # API calls
│   ├── app.js           # Main app logic
│   ├── astronomy.js     # Celestial calculations
│   ├── config.js        # Configuration
│   ├── display.js       # UI rendering
│   ├── facts.js         # AI fact generation
│   ├── location.js      # Location management
│   └── map.js           # Map display
├── index.html           # Main HTML
├── styles.css           # Styles with animations
├── server.js            # Backend server
└── package.json         # Dependencies
```

## 🌐 Deployment

### Frontend (GitHub Pages)
https://ratanravichandran.github.io/StarBot/

### Backend (Render)

## 🙏 Data Sources

- NASA JPL Horizons API - Solar system object positions
- OpenSky Network - Real-time airplane tracking
- CelesTrak - Satellite TLE data
- OpenAI - AI-powered fact generation
- Yale Bright Star Catalog - Star positions
- AviationStack API - Flight route information
---

Made with ✨ by [RatanRavichandran](https://github.com/RatanRavichandran)
