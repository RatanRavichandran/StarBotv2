// Animated space starfield — parallax drift, depth projection, shooting stars
const Starfield = {
    canvas: null,
    ctx: null,
    layers: [],          // 3 parallax layers
    shootingStars: [],
    animationId: null,
    width: 0,
    height: 0,
    mouseX: 0.5,
    mouseY: 0.5,
    lastTime: 0,

    // Config
    LAYER_CONFIG: [
        { count: 200, speed: 0.08, sizeMin: 0.3, sizeMax: 0.8, alphaMin: 0.08, alphaMax: 0.25 },  // far
        { count: 120, speed: 0.18, sizeMin: 0.5, sizeMax: 1.3, alphaMin: 0.15, alphaMax: 0.45 },  // mid
        { count: 50,  speed: 0.35, sizeMin: 0.8, sizeMax: 2.0, alphaMin: 0.3,  alphaMax: 0.7  },  // near
    ],
    SHOOTING_STAR_CHANCE: 0.008,  // per frame chance
    DRIFT_ANGLE: Math.PI * 0.15,  // ~27° diagonal drift

    init() {
        this.canvas = document.getElementById('starfield');
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this.resize();
        this.createLayers();
        this.lastTime = performance.now();
        this.animate();

        window.addEventListener('resize', () => {
            this.resize();
            this.createLayers();
        });

        // Subtle parallax on mouse
        window.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX / this.width;
            this.mouseY = e.clientY / this.height;
        });
    },

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    },

    createLayers() {
        this.layers = this.LAYER_CONFIG.map(cfg => {
            const stars = [];
            for (let i = 0; i < cfg.count; i++) {
                stars.push(this._makeStar(cfg, true));
            }
            return { ...cfg, stars };
        });
    },

    _makeStar(cfg, randomPos) {
        return {
            x: randomPos ? Math.random() * (this.width + 200) - 100 : this.width + Math.random() * 100,
            y: Math.random() * (this.height + 200) - 100,
            radius: cfg.sizeMin + Math.random() * (cfg.sizeMax - cfg.sizeMin),
            baseAlpha: cfg.alphaMin + Math.random() * (cfg.alphaMax - cfg.alphaMin),
            twinkleSpeed: 1.5 + Math.random() * 3,
            twinklePhase: Math.random() * Math.PI * 2,
            driftY: (Math.random() - 0.5) * 0.3,  // slight vertical wander
        };
    },

    _spawnShootingStar() {
        const fromRight = Math.random() > 0.5;
        const angle = (Math.PI * 0.12) + Math.random() * (Math.PI * 0.25); // 22°–67° downward
        const speed = 6 + Math.random() * 8;
        return {
            x: fromRight ? this.width + 20 : Math.random() * this.width * 0.7,
            y: -20 + Math.random() * this.height * 0.4,
            vx: -Math.cos(angle) * speed * (fromRight ? 1 : -0.6),
            vy: Math.sin(angle) * speed,
            life: 1.0,
            decay: 0.008 + Math.random() * 0.012,
            length: 60 + Math.random() * 100,
            width: 1 + Math.random() * 1.5,
        };
    },

    animate() {
        const now = performance.now();
        const dt = Math.min((now - this.lastTime) / 16.667, 3); // normalise to ~60fps, cap
        this.lastTime = now;
        const t = now * 0.001;

        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        // Fade trail — gives depth & motion blur feel
        ctx.fillStyle = 'rgba(8, 9, 14, 0.35)';
        ctx.fillRect(0, 0, w, h);

        // Mouse parallax offsets (very subtle)
        const mx = (this.mouseX - 0.5) * 2;
        const my = (this.mouseY - 0.5) * 2;

        // Draw star layers
        const driftX = -Math.cos(this.DRIFT_ANGLE);
        const driftY = Math.sin(this.DRIFT_ANGLE);

        for (const layer of this.layers) {
            const parallaxX = mx * layer.speed * 12;
            const parallaxY = my * layer.speed * 12;

            for (const s of layer.stars) {
                // Move
                s.x += driftX * layer.speed * dt + s.driftY * 0.1 * dt;
                s.y += driftY * layer.speed * 0.5 * dt;

                // Wrap around
                if (s.x < -100) { s.x = w + 50; s.y = Math.random() * h; }
                if (s.x > w + 100) { s.x = -50; s.y = Math.random() * h; }
                if (s.y < -100) { s.y = h + 50; s.x = Math.random() * w; }
                if (s.y > h + 100) { s.y = -50; s.x = Math.random() * w; }

                // Twinkle
                const twinkle = 0.5 + 0.5 * Math.sin(t * s.twinkleSpeed + s.twinklePhase);
                const alpha = s.baseAlpha * (0.3 + 0.7 * twinkle);

                const drawX = s.x + parallaxX;
                const drawY = s.y + parallaxY;

                // Glow for larger/brighter stars
                if (s.radius > 1.2 && alpha > 0.35) {
                    ctx.beginPath();
                    const grad = ctx.createRadialGradient(drawX, drawY, 0, drawX, drawY, s.radius * 4);
                    grad.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.15})`);
                    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
                    ctx.fillStyle = grad;
                    ctx.arc(drawX, drawY, s.radius * 4, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Star dot
                ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                ctx.beginPath();
                ctx.arc(drawX, drawY, s.radius, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Shooting stars
        if (Math.random() < this.SHOOTING_STAR_CHANCE) {
            this.shootingStars.push(this._spawnShootingStar());
        }

        for (let i = this.shootingStars.length - 1; i >= 0; i--) {
            const ss = this.shootingStars[i];

            ss.x += ss.vx * dt;
            ss.y += ss.vy * dt;
            ss.life -= ss.decay * dt;

            if (ss.life <= 0) {
                this.shootingStars.splice(i, 1);
                continue;
            }

            const tailX = ss.x - (ss.vx / Math.sqrt(ss.vx * ss.vx + ss.vy * ss.vy)) * ss.length * ss.life;
            const tailY = ss.y - (ss.vy / Math.sqrt(ss.vx * ss.vx + ss.vy * ss.vy)) * ss.length * ss.life;

            const grad = ctx.createLinearGradient(ss.x, ss.y, tailX, tailY);
            grad.addColorStop(0, `rgba(255, 255, 255, ${ss.life * 0.9})`);
            grad.addColorStop(0.4, `rgba(255, 255, 255, ${ss.life * 0.3})`);
            grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

            ctx.strokeStyle = grad;
            ctx.lineWidth = ss.width * ss.life;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(ss.x, ss.y);
            ctx.lineTo(tailX, tailY);
            ctx.stroke();

            // Bright head
            ctx.fillStyle = `rgba(255, 255, 255, ${ss.life})`;
            ctx.beginPath();
            ctx.arc(ss.x, ss.y, ss.width * 0.5, 0, Math.PI * 2);
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
