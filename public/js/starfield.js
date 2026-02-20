// Minimalist static starfield with gentle twinkle
const Starfield = {
    canvas: null,
    ctx: null,
    stars: [],
    animationId: null,
    width: 0,
    height: 0,
    
    STAR_COUNT: 180,
    
    init() {
        this.canvas = document.getElementById('starfield');
        if (!this.canvas) return;
        
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        this.createStars();
        this.animate();
        
        window.addEventListener('resize', () => {
            this.resize();
            this.createStars();
        });
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
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                radius: Math.random() * 1.2 + 0.2,
                baseAlpha: Math.random() * 0.4 + 0.1,
                twinkleSpeed: Math.random() * 0.008 + 0.002,
                twinklePhase: Math.random() * Math.PI * 2,
            });
        }
    },
    
    animate() {
        const ctx = this.ctx;
        const now = performance.now() * 0.001;
        
        ctx.clearRect(0, 0, this.width, this.height);
        
        for (const s of this.stars) {
            const twinkle = 0.5 + 0.5 * Math.sin(now * s.twinkleSpeed * 6 + s.twinklePhase);
            const alpha = s.baseAlpha * (0.4 + 0.6 * twinkle);
            
            ctx.fillStyle = `rgba(200, 210, 230, ${alpha})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
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
