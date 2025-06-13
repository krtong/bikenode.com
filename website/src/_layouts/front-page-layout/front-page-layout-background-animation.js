document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('front-page-layout-background-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let width, height;
    
    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }
    
    window.addEventListener('resize', resize);
    resize();
    
    // Animation state
    let time = 0;
    let mouseX = width / 2;
    let mouseY = height / 2;
    
    // Track mouse movement
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });
    
    // Particle system for dynamic background
    class Particle {
        constructor() {
            this.reset();
            this.y = Math.random() * height;
        }
        
        reset() {
            this.x = Math.random() * width;
            this.y = -10;
            this.z = Math.random() * 1000;
            this.size = Math.random() * 2 + 0.5;
            this.speed = (1000 - this.z) / 1000 * 2 + 0.5;
            this.opacity = (1000 - this.z) / 1000;
        }
        
        update() {
            this.y += this.speed;
            if (this.y > height + 10) {
                this.reset();
            }
        }
        
        draw() {
            ctx.save();
            ctx.globalAlpha = this.opacity * 0.6;
            ctx.fillStyle = '#5865f2';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#5865f2';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
    
    // Create particles
    const particles = [];
    for (let i = 0; i < 150; i++) {
        particles.push(new Particle());
    }
    
    // Hexagonal grid nodes
    class HexNode {
        constructor(x, y, index) {
            this.x = x;
            this.y = y;
            this.baseX = x;
            this.baseY = y;
            this.index = index;
            this.connections = [];
            this.pulsePhase = Math.random() * Math.PI * 2;
            this.activity = 0;
            this.targetActivity = 0;
        }
        
        update(time) {
            // Floating motion
            this.x = this.baseX + Math.sin(time * 0.001 + this.pulsePhase) * 5;
            this.y = this.baseY + Math.cos(time * 0.001 + this.pulsePhase * 0.7) * 5;
            
            // Activity based on mouse proximity
            const dx = mouseX - this.x;
            const dy = mouseY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            this.targetActivity = Math.max(0, 1 - dist / 300);
            
            // Smooth activity transition
            this.activity += (this.targetActivity - this.activity) * 0.1;
        }
        
        draw(time) {
            const pulse = Math.sin(time * 0.002 + this.pulsePhase) * 0.5 + 0.5;
            const size = 3 + pulse * 2 + this.activity * 10;
            
            // Node glow
            ctx.save();
            ctx.globalAlpha = 0.3 + this.activity * 0.7;
            const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, size * 4);
            gradient.addColorStop(0, '#5865f2');
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, size * 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            
            // Node core
            ctx.fillStyle = '#748cff';
            ctx.beginPath();
            ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
            ctx.fill();
            
            // Inner bright core
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(this.x, this.y, size * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Create hexagonal grid
    const hexNodes = [];
    const hexSize = 100;
    const rows = Math.ceil(height / hexSize) + 2;
    const cols = Math.ceil(width / hexSize) + 2;
    
    for (let row = -1; row < rows; row++) {
        for (let col = -1; col < cols; col++) {
            const x = col * hexSize * 0.866;
            const y = row * hexSize + (col % 2) * hexSize * 0.5;
            hexNodes.push(new HexNode(x, y, hexNodes.length));
        }
    }
    
    // Connect nearby nodes
    hexNodes.forEach((node, i) => {
        hexNodes.forEach((other, j) => {
            if (i !== j) {
                const dx = node.baseX - other.baseX;
                const dy = node.baseY - other.baseY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < hexSize * 1.1) {
                    node.connections.push(other);
                }
            }
        });
    });
    
    // Energy waves
    class EnergyWave {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.radius = 0;
            this.maxRadius = 500;
            this.speed = 3;
            this.opacity = 1;
        }
        
        update() {
            this.radius += this.speed;
            this.opacity = 1 - (this.radius / this.maxRadius);
            return this.radius < this.maxRadius;
        }
        
        draw() {
            ctx.save();
            ctx.globalAlpha = this.opacity * 0.3;
            ctx.strokeStyle = '#5865f2';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }
    
    const energyWaves = [];
    
    // Create energy wave on click
    canvas.addEventListener('click', (e) => {
        energyWaves.push(new EnergyWave(e.clientX, e.clientY));
    });
    
    // Data streams
    class DataStream {
        constructor(startNode, endNode) {
            this.start = startNode;
            this.end = endNode;
            this.progress = 0;
            this.speed = 0.02;
            this.particles = [];
            
            // Create particle trail
            for (let i = 0; i < 5; i++) {
                this.particles.push({
                    offset: i * 0.2,
                    size: 3 - i * 0.5
                });
            }
        }
        
        update() {
            this.progress += this.speed;
            if (this.progress > 1) {
                this.progress = 0;
                // Switch direction randomly
                if (Math.random() > 0.5) {
                    const temp = this.start;
                    this.start = this.end;
                    this.end = temp;
                }
            }
        }
        
        draw() {
            const dx = this.end.x - this.start.x;
            const dy = this.end.y - this.start.y;
            
            // Draw connection line
            ctx.save();
            ctx.globalAlpha = 0.1;
            ctx.strokeStyle = '#5865f2';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(this.start.x, this.start.y);
            ctx.lineTo(this.end.x, this.end.y);
            ctx.stroke();
            ctx.restore();
            
            // Draw moving particles
            this.particles.forEach(particle => {
                const t = (this.progress + particle.offset) % 1;
                const x = this.start.x + dx * t;
                const y = this.start.y + dy * t;
                
                ctx.save();
                ctx.globalAlpha = 0.8;
                ctx.fillStyle = '#748cff';
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#5865f2';
                ctx.beginPath();
                ctx.arc(x, y, particle.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });
        }
    }
    
    // Create data streams between connected nodes
    const dataStreams = [];
    hexNodes.forEach((node, i) => {
        if (i % 3 === 0 && node.connections.length > 0) {
            const target = node.connections[Math.floor(Math.random() * node.connections.length)];
            dataStreams.push(new DataStream(node, target));
        }
    });
    
    // Main render loop
    function render(timestamp) {
        time = timestamp;
        
        // Dark gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#0a0a0f');
        gradient.addColorStop(0.5, '#131320');
        gradient.addColorStop(1, '#0a0a0f');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        // Update and draw particles
        particles.forEach(particle => {
            particle.update();
            particle.draw();
        });
        
        // Update and draw hex nodes
        hexNodes.forEach(node => {
            node.update(time);
        });
        
        // Draw connections
        ctx.save();
        ctx.globalAlpha = 0.05;
        ctx.strokeStyle = '#5865f2';
        ctx.lineWidth = 1;
        hexNodes.forEach(node => {
            node.connections.forEach(other => {
                if (node.index < other.index) { // Avoid drawing twice
                    ctx.beginPath();
                    ctx.moveTo(node.x, node.y);
                    ctx.lineTo(other.x, other.y);
                    ctx.stroke();
                }
            });
        });
        ctx.restore();
        
        // Draw data streams
        dataStreams.forEach(stream => {
            stream.update();
            stream.draw();
        });
        
        // Draw nodes on top
        hexNodes.forEach(node => {
            node.draw(time);
        });
        
        // Update and draw energy waves
        for (let i = energyWaves.length - 1; i >= 0; i--) {
            if (!energyWaves[i].update()) {
                energyWaves.splice(i, 1);
            } else {
                energyWaves[i].draw();
            }
        }
        
        // Subtle vignette effect
        const vignette = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, Math.max(width, height) * 0.7);
        vignette.addColorStop(0, 'transparent');
        vignette.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, width, height);
        
        requestAnimationFrame(render);
    }
    
    requestAnimationFrame(render);
});