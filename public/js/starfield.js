// Canvas-based animated starfield
const Starfield = {
    canvas: null,
    ctx: null,
    stars: [],
    animationId: null,
    width: 0,
    height: 0,
    
    STAR_COUNT: 350,
    MAX_DEPTH: 1000,
    SPEED: 0.15,
    
    init() {
        this.canvas = document.getElementById('starfield');
        if (!this.canvas) return;
        
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        this.createStars();
        this.animate();
        
        window.addEventListener('resize', () => this.resize());
    },
    
    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    },
    
    createStars() {
        this.stars = [];
        for (let i = 0; i < this.STAR_COUNT; i++) {
            this.stars.push({
                x: Math.random() * this.width - this.width / 2,
                y: Math.random() * this.height - this.height / 2,
                z: Math.random() * this.MAX_DEPTH,
                prevX: 0,
                prevY: 0,
                size: Math.random() * 1.5 + 0.5,
                twinkleSpeed: Math.random() * 0.02 + 0.005,
                twinklePhase: Math.random() * Math.PI * 2,
                color: this.getStarColor()
            });
        }
    },
    
    getStarColor() {
        const colors = [
            { r: 240, g: 244, b: 255 },  // white-blue
            { r: 255, g: 240, b: 220 },  // warm white
            { r: 200, g: 220, b: 255 },  // blue
            { r: 255, g: 220, b: 180 },  // yellow
            { r: 255, g: 200, b: 200 },  // red tint
            { r: 220, g: 240, b: 255 },  // pale blue
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    },
    
    animate() {
        const ctx = this.ctx;
        const cx = this.width / 2;
        const cy = this.height / 2;
        const now = performance.now() * 0.001;
        
        // Fade trail effect
        ctx.fillStyle = 'rgba(4, 6, 15, 0.3)';
        ctx.fillRect(0, 0, this.width, this.height);
        
        for (const star of this.stars) {
            // Store previous position
            star.prevX = star.x / (star.z * 0.001) + cx;
            star.prevY = star.y / (star.z * 0.001) + cy;
            
            // Move star closer
            star.z -= this.SPEED;
            
            // Reset if too close
            if (star.z <= 0) {
                star.x = Math.random() * this.width - cx;
                star.y = Math.random() * this.height - cy;
                star.z = this.MAX_DEPTH;
            }
            
            // Project to 2D
            const k = 128.0 / star.z;
            const sx = star.x * k + cx;
            const sy = star.y * k + cy;
            
            // Skip if off screen
            if (sx < -10 || sx > this.width + 10 || sy < -10 || sy > this.height + 10) continue;
            
            // Calculate brightness with twinkle
            const depthFactor = 1 - star.z / this.MAX_DEPTH;
            const twinkle = 0.5 + 0.5 * Math.sin(now * star.twinkleSpeed * 10 + star.twinklePhase);
            const brightness = depthFactor * (0.6 + 0.4 * twinkle);
            const size = star.size * depthFactor * (0.8 + 0.2 * twinkle);
            
            const { r, g, b } = star.color;
            
            // Glow
            if (size > 1) {
                const glowSize = size * 3;
                const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowSize);
                gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${brightness * 0.4})`);
                gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(sx, sy, glowSize, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Star point
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${brightness})`;
            ctx.beginPath();
            ctx.arc(sx, sy, Math.max(size * 0.6, 0.3), 0, Math.PI * 2);
            ctx.fill();
        }
        
        this.animationId = requestAnimationFrame(() => this.animate());
    },
    
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }
};

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Starfield.init());
} else {
    Starfield.init();
}
