document.addEventListener('DOMContentLoaded', function() {
    (function() {
        // **Setup Canvas and Context**
        const canvas = document.getElementById('backgroundCanvas');
        if (!canvas) {
            console.error('Canvas element not found');
            return;
        }
        const ctx = canvas.getContext('2d');

        // **Resize Canvas to Fit Window**
        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        // **Configuration Constants**
        const segmentLength = 100;
        const roadWidth = 2000;
        const segmentCount = 600;
        const cacheSegmentCount = 1000;
        const baseCameraHeight = 1000;
        const fov = 100;
        const visibleDistance = 20000;
        let cameraZ = 0;
        let totalDistance = 0;
        const segments = [];

        // **Mouse Controls**
        let mouseY = 0;
        let targetDistance = 1.0;
        let currentDistance = 1.0;
        const distanceSmoothness = 0.05;
        const minDistance = 0.6;
        const maxDistance = 1.5;

        document.addEventListener('mousemove', function(event) {
            mouseY = (event.clientY / window.innerHeight) * 2 - 1;
            targetDistance = minDistance + ((1 - mouseY) / 2) * (maxDistance - minDistance);
        });

        // **Speed Control**
        const baseSpeed = 3000;
        const variation = 500;
        let lastTime = 0;

        // **Fibonacci Sequence and Golden Ratio**
        const goldenRatio = 1.61803398875;
        const fibSequence = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144];

        // **Perlin-like Noise Functions**
        class PerlinNoise {
            constructor(seed = Math.random()) {
                this.seed = seed;
                this.gradients = {};
                this.memory = {};
            }
            rand_vect() {
                let theta = Math.random() * 2 * Math.PI;
                return {x: Math.cos(theta), y: Math.sin(theta)};
            }
            dot_prod_grid(x, y, vx, vy) {
                let g_vect;
                let d_vect = {x: x - vx, y: y - vy};
                if (this.gradients[[vx,vy]]) {
                    g_vect = this.gradients[[vx,vy]];
                } else {
                    g_vect = this.rand_vect();
                    this.gradients[[vx, vy]] = g_vect;
                }
                return d_vect.x * g_vect.x + d_vect.y * g_vect.y;
            }
            smootherstep(x) {
                return 6*x**5 - 15*x**4 + 10*x**3;
            }
            interp(x, a, b) {
                return a + this.smootherstep(x) * (b-a);
            }
            get(x, y) {
                if (this.memory.hasOwnProperty([x,y])) 
                    return this.memory[[x,y]];
                let xf = Math.floor(x);
                let yf = Math.floor(y);
                let tl = this.dot_prod_grid(x, y, xf, yf);
                let tr = this.dot_prod_grid(x, y, xf+1, yf);
                let bl = this.dot_prod_grid(x, y, xf, yf+1);
                let br = this.dot_prod_grid(x, y, xf+1, yf+1);
                let xt = this.interp(x-xf, tl, tr);
                let xb = this.interp(x-xf, bl, br);
                let v = this.interp(y-yf, xt, xb);
                this.memory[[x,y]] = v;
                return v;
            }
        }

        const curveNoise = new PerlinNoise(42);
        const hillNoise = new PerlinNoise(17);
        const treeNoise = new PerlinNoise(33);

        function naturalNoise(z, noiseObj, scale, octaves) {
            let value = 0;
            let amplitude = 1;
            let frequency = 1;
            let max = 0;
            for(let i = 0; i < octaves; i++) {
                value += amplitude * noiseObj.get(z * frequency / scale, 0.5);
                max += amplitude;
                amplitude *= 0.5;
                frequency *= 2;
            }
            return value / max;
        }

        function generateNaturalCurve(z) {
            let baseNoise = naturalNoise(z, curveNoise, 10000, 3);
            let harmonics = 0;
            for(let i = 0; i < fibSequence.length - 1; i++) {
                let freq = fibSequence[i] / 100;
                let amp = fibSequence[fibSequence.length - i - 1] / 89;
                harmonics += Math.sin(z * freq / 1000) * amp;
            }
            return baseNoise * 3000 + harmonics * 800;
        }

        function generateNaturalHill(z) {
            let baseNoise = naturalNoise(z, hillNoise, 15000, 4);
            let harmonics = 0;
            for(let i = 1; i < 5; i++) {
                let freq = Math.pow(goldenRatio, i) / 10;
                let amp = 1 / Math.pow(goldenRatio, i);
                harmonics += Math.sin(z * freq / 1000 + i) * amp;
            }
            return baseNoise * 800 + harmonics * 400;
        }

        function generateSegment(z) {
            return {
                z: z,
                curve: generateNaturalCurve(z),
                hill: generateNaturalHill(z)
            };
        }

        for (let i = 0; i < segmentCount; i++) {
            const z = i * segmentLength;
            const segData = generateSegment(z);
            segments.push({
                index: i,
                p1: { world: { x: 0, y: 0, z: z }, screen: {} },
                p2: { world: { x: 0, y: 0, z: (i + 1) * segmentLength }, screen: {} },
                curve: segData.curve,
                hill: segData.hill
            });
        }

        // **Modified: Lower threshold for denser trees**
        function shouldPlaceTree(z) {
            const noiseValue = treeNoise.get(z / 1000, 0.5) * 0.5 + 0.5;
            const fibIndex = Math.floor(z / 500) % fibSequence.length;
            const threshold = 0.5 - fibSequence[fibIndex] / 200; // Lowered from 0.7 to 0.5
            return noiseValue > threshold;
        }

        function getTreeHeight(z) {
            const baseHeight = 400;
            const noiseValue = treeNoise.get(z / 500 + 100, 0.7);
            const variation = noiseValue * 300;
            const fibIndex = Math.floor(z / 300) % fibSequence.length;
            const fibInfluence = fibSequence[fibIndex] / 89 * 100;
            return baseHeight + variation + fibInfluence;
        }

        function project(point, camX, camY, camZ) {
            const dx = point.world.x - camX;
            const dy = point.world.y - camY;
            const dz = point.world.z - camZ;
            if (dz <= 0) return false;
            const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);
            const correction = 1.0 + (distanceFromCenter / 5000) * 0.15;
            const scale = (fov / dz) * correction;
            point.screen.x = canvas.width / 2 + scale * dx;
            point.screen.y = canvas.height / 2 - scale * dy;
            point.screen.scale = scale;
            return true;
        }

        function drawLine(x1, y1, x2, y2, alpha = 1) {
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }

        // **New: Draw trees with branches for realism**
        function drawTree(base, top, scale, alpha) {
            // Draw trunk
            drawLine(base.screen.x, base.screen.y, top.screen.x, top.screen.y, alpha);

            // Add branches (simple canopy)
            const branchLength = 50 * scale; // Scale branches with distance
            const branchAngle = Math.PI / 6; // 30 degrees
            const branchX1 = top.screen.x + branchLength * Math.cos(branchAngle);
            const branchY1 = top.screen.y - branchLength * Math.sin(branchAngle);
            const branchX2 = top.screen.x + branchLength * Math.cos(-branchAngle);
            const branchY2 = top.screen.y - branchLength * Math.sin(-branchAngle);
            drawLine(top.screen.x, top.screen.y, branchX1, branchY1, alpha * 0.7);
            drawLine(top.screen.x, top.screen.y, branchX2, branchY2, alpha * 0.7);
        }

        // Render loop
        function render(timestamp) {
            if (lastTime === 0) lastTime = timestamp;
            const deltaTime = (timestamp - lastTime) / 1000;
            lastTime = timestamp;

            const speed = baseSpeed + Math.sin(timestamp * 0.001) * variation;
            cameraZ += speed * deltaTime;
            totalDistance += speed * deltaTime;

            const maxZ = Math.max(...segments.map(s => s.p2.world.z));
            if (cameraZ + visibleDistance > maxZ - 2000) {
                const nextZ = maxZ;
                const segData = generateSegment(nextZ);
                segments.push({
                    index: segments.length,
                    p1: { world: { x: 0, y: 0, z: nextZ }, screen: {} },
                    p2: { world: { x: 0, y: 0, z: nextZ + segmentLength }, screen: {} },
                    curve: segData.curve,
                    hill: segData.hill
                });
                if (segments.length > cacheSegmentCount) {
                    segments.shift();
                    segments.forEach((seg, idx) => seg.index = idx);
                }
            }

            currentDistance += (targetDistance - currentDistance) * distanceSmoothness;
            const currentCameraY = baseCameraHeight * (1 - (currentDistance - 1.0) * 0.3);

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, '#242a36');
            gradient.addColorStop(0.4, '#131519');
            gradient.addColorStop(0.7, '#080809');
            gradient.addColorStop(1, '#000000');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.strokeStyle = '#5865F2';
            ctx.lineWidth = 1;

            const minZ = cameraZ;
            const maxVisibleZ = cameraZ + visibleDistance;
            const visibleSegments = segments.filter(seg => 
                seg.p2.world.z > minZ && seg.p1.world.z < maxVisibleZ
            ).sort((a, b) => b.p1.world.z - a.p1.world.z);

            for (const segment of visibleSegments) {
                const nextIdx = segment.index + 1;
                if (nextIdx >= segments.length) continue;
                const nextSegment = segments[nextIdx];
                segment.p1.world.x = segment.curve;
                segment.p1.world.y = segment.hill;
                segment.p2.world.x = nextSegment.curve;
                segment.p2.world.y = nextSegment.hill;
                const projected1 = project(segment.p1, 0, currentCameraY, cameraZ);
                const projected2 = project(segment.p2, 0, currentCameraY, cameraZ);
                if (!projected1 || !projected2) continue;
                const p1 = segment.p1.screen;
                const p2 = segment.p2.screen;
                const distanceRatio = (segment.p1.world.z - cameraZ) / visibleDistance;
                const fade = Math.min(1, 1 - distanceRatio * distanceRatio);
                const width1 = (roadWidth / 2) * p1.scale;
                const width2 = (roadWidth / 2) * p2.scale;
                drawLine(p1.x - width1, p1.y, p2.x - width2, p2.y, fade);
                drawLine(p1.x + width1, p1.y, p2.x + width2, p2.y, fade);
                const midZ = segment.p1.world.z;
                const fibMod = Math.floor(midZ / 100) % fibSequence.length;
                if (fibMod < 3 || fibMod > 8) {
                    drawLine(p1.x, p1.y, p2.x, p2.y, fade * 0.8);
                }
            }

            const startZ = Math.floor(cameraZ / 100) * 100;
            const endZ = cameraZ + visibleDistance;

            function findSegmentByZ(z) {
                for (let i = 0; i < segments.length - 1; i++) {
                    if (segments[i].p1.world.z <= z && segments[i+1].p1.world.z > z) {
                        return i;
                    }
                }
                return Math.floor((z - segments[0].p1.world.z) / segmentLength);
            }

            // **Modified: Draw trees with branches and depth**
            for (let z = startZ; z < endZ; z += 100) {
                const segmentIdx = findSegmentByZ(z);
                if (segmentIdx < 0 || segmentIdx >= segments.length - 1) continue;
                const segment = segments[segmentIdx];
                const nextSegment = segments[segmentIdx + 1];
                const segStartZ = segment.p1.world.z;
                const segEndZ = nextSegment.p1.world.z;
                const t = (z - segStartZ) / (segEndZ - segStartZ);
                const curve = segment.curve * (1 - t) + nextSegment.curve * t;

                // Tree on the left
                if (shouldPlaceTree(z)) {
                    const offset = 1.5 + (treeNoise.get(z / 800, 0.2) * 0.5);
                    const treeBase = { world: { x: curve - roadWidth * offset, y: 0, z: z }, screen: {} };
                    const treeTop = { world: { x: treeBase.world.x, y: getTreeHeight(z), z: z }, screen: {} };
                    const projectedBase = project(treeBase, 0, currentCameraY, cameraZ);
                    const projectedTop = project(treeTop, 0, currentCameraY, cameraZ);
                    if (projectedBase && projectedTop) {
                        const distanceRatio = (z - cameraZ) / visibleDistance;
                        const opacity = Math.max(0, 1 - distanceRatio * 1.2);
                        const scale = projectedBase.scale;
                        drawTree(treeBase, treeTop, scale, opacity);
                    }
                }

                // Tree on the right
                if (shouldPlaceTree(z + 500)) {
                    const offset = 1.5 + (treeNoise.get((z + 500) / 800, 0.8) * 0.5);
                    const treeBase = { world: { x: curve + roadWidth * offset, y: 0, z: z }, screen: {} };
                    const treeTop = { world: { x: treeBase.world.x, y: getTreeHeight(z + 500), z: z }, screen: {} };
                    const projectedBase = project(treeBase, 0, currentCameraY, cameraZ);
                    const projectedTop = project(treeTop, 0, currentCameraY, cameraZ);
                    if (projectedBase && projectedTop) {
                        const distanceRatio = (z - cameraZ) / visibleDistance;
                        const opacity = Math.max(0, 1 - distanceRatio * 1.2);
                        const scale = projectedBase.scale;
                        drawTree(treeBase, treeTop, scale, opacity);
                    }
                }
            }

            requestAnimationFrame(render);
        }

        // **Start Animation**
        requestAnimationFrame(render);
    })();
});