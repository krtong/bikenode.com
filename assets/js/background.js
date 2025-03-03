document.addEventListener('DOMContentLoaded', function() {
    const isDarkMode = () => {
        const isDarkReader = document.documentElement.classList.contains('darkreader') || 
                             document.querySelector('.darkreader') !== null;
        const isPrefersColorScheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        return isDarkReader || isPrefersColorScheme;
    };

    const colors = { // these do nothing
        light: {
            sky: ['#121417', '#1e2228', '#1a1c1f', '#161719'],
            ground: '#080809',
            road: '#4f59c9',
            mountain: '#b2c7ff',
            tree: {
                trunk: '#5D6378',
                foliage: ['#4C5268', '#546078', '#505D75']
            }
        },
        dark: {
            sky: ['#121417', '#1e2228', '#1a1c1f', '#161719'],
            ground: '#080809',
            road: '#3b407b',
            mountain: '#0033b5',
            tree: {
                trunk: '#4D5368',
                foliage: ['#3C4258', '#445068', '#404D65']
            }
        }
    };

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
                const key = JSON.stringify([x, y]);
                if (this.memory.hasOwnProperty(key)) 
                    return this.memory[key];
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
            // Increase scale from 10000 to 20000 to stretch out curves
            let baseNoise = naturalNoise(z, curveNoise, 20000, 3);
            
            // Reduce number of harmonics for smoother curves
            let harmonics = 0;
            // Only use first 5 Fibonacci values instead of all of them
            for(let i = 0; i < 5; i++) {
                // Lower frequency for longer curves
                let freq = fibSequence[i] / 200; // Reduced from /100 to /200
                let amp = fibSequence[fibSequence.length - i - 1] / 89;
                harmonics += Math.sin(z * freq / 1000) * amp;
            }
            
            // Add a persistence factor to maintain curve direction
            const persistenceFactor = Math.sin(z / 20000) * 1500;
            
            // Reduce overall amplitude of harmonics (800 -> 500)
            return baseNoise * 3000 + harmonics * 500 + persistenceFactor;
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

        // Update the shouldPlaceTree function to be more sparse
        function shouldPlaceTree(z) {
            // Use a more sophisticated hash function for better distribution
            const hashValue = Math.sin(z * 12.9898 + 4.1414) * 43758.5453;
            // Higher threshold (0.95) for much sparser trees
            return (hashValue % 1) > 0.95;
        }

        // Enhance tree height function to create more variety
        function getTreeHeight(z) {
            // Base height plus more variation
            return 300 + Math.abs(naturalNoise(z, treeNoise, 5000, 2) * 500);
        }

        // Add tree variety function
        function getTreeType(z) {
            const type = Math.floor((Math.sin(z * 0.3) * 0.5 + 0.5) * 3);
            return type; // 0, 1, or 2 for different tree types
        }

        // Update the drawTree function to support multiple tree types
        function drawTree(base, top, scale, alpha, treeType = 0) {
            // Draw trunk - brighter color
            ctx.strokeStyle = colors[isDarkMode() ? 'dark' : 'light'].tree.trunk;
            ctx.lineWidth = 2 * scale;
            drawLine(base.screen.x, base.screen.y, top.screen.x, top.screen.y, alpha);
            
            // Different tree types with brighter colors
            const branchLength = 60 * scale;
            
            switch(treeType) {
                case 0: // Pine tree - brighter
                    ctx.strokeStyle = colors[isDarkMode() ? 'dark' : 'light'].tree.foliage[0];
                    ctx.lineWidth = 1 * scale;
                    // Draw triangular canopy
                    const levels = 3;
                    for (let i = 0; i < levels; i++) {
                        const heightRatio = 0.5 + (i * 0.2);
                        const width = branchLength * (1 - i/levels);
                        const y = base.screen.y - (top.screen.y - base.screen.y) * heightRatio;
                        drawLine(top.screen.x - width, y, top.screen.x + width, y, alpha * 0.8);
                        drawLine(top.screen.x, y - width * 0.5, top.screen.x - width, y, alpha * 0.8);
                        drawLine(top.screen.x, y - width * 0.5, top.screen.x + width, y, alpha * 0.8);
                    }
                    break;
                    
                case 1: // Rounded tree - brighter
                    ctx.strokeStyle = colors[isDarkMode() ? 'dark' : 'light'].tree.foliage[1];
                    ctx.lineWidth = 1 * scale;
                    // Add branches in a more rounded pattern
                    for (let i = 0; i < 5; i++) {
                        const angle = (i / 5) * Math.PI;
                        const branchX = top.screen.x + branchLength * Math.cos(angle);
                        const branchY = top.screen.y - branchLength * Math.sin(angle);
                        drawLine(top.screen.x, top.screen.y, branchX, branchY, alpha * 0.7);
                    }
                    break;
                    
                case 2: // Simple tree - brighter
                    ctx.strokeStyle = colors[isDarkMode() ? 'dark' : 'light'].tree.foliage[2];
                    ctx.lineWidth = 1 * scale;
                    // Simple Y-shaped branches
                    const branchAngle = Math.PI / 5;
                    const branchX1 = top.screen.x + branchLength * Math.cos(branchAngle);
                    const branchY1 = top.screen.y - branchLength * Math.sin(branchAngle);
                    const branchX2 = top.screen.x + branchLength * Math.cos(-branchAngle);
                    const branchY2 = top.screen.y - branchLength * Math.sin(-branchAngle);
                    drawLine(top.screen.x, top.screen.y, branchX1, branchY1, alpha * 0.7);
                    drawLine(top.screen.x, top.screen.y, branchX2, branchY2, alpha * 0.7);
                    break;
            }
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

        // Add this function to calculate brightness based on distance
        function calculateBrightness(z) {
            // Calculate normalized distance (0 = close, 1 = far)
            const normalizedDist = Math.min(z / visibleDistance, 1);
            
            // Inverse the value and add more dramatic falloff
            // Objects close to camera (small z) will have brightness near 1
            // Objects far away will have brightness approaching 0.3
            return 1 - (normalizedDist * 0.7);
        }

        // Modify the drawLine function to use brightness factor
        function drawLine(p1x, p1y, p2x, p2y, alpha = 1) {
            // Preserve original alpha for distance-based calculation
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.moveTo(p1x, p1y);
            ctx.lineTo(p2x, p2y);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        // In your render/drawing loop, update how you draw segments
        function renderSegment(segment) {
            // ... existing code ...
            
            // Calculate brightness based on segment distance
            const brightness = calculateBrightness(segment.z);
            
            // Use brightness to adjust stroke colors
            const r = Math.round(91 * brightness); // For road: 5B65D2 (91, 101, 210)
            const g = Math.round(101 * brightness);
            const b = Math.round(210 * brightness);
            
            ctx.strokeStyle = `rgb(${r},${g},${b})`;
            
            // Apply brightness to alpha value for line drawing
            const adjustedAlpha = fade * brightness * 1.3; // Multiply by 1.3 to make close objects extra bright
            
            // Draw with adjusted brightness
            drawLine(p1.x, p1.y, p2.x, p2.y, adjustedAlpha);
            
            // For tree rendering, also use brightness factor
            // ... in tree drawing code ...
            const treeBrightness = calculateBrightness(treeSegment.z);
            ctx.strokeStyle = `rgb(${Math.round(108 * treeBrightness)},${Math.round(114 * treeBrightness)},${Math.round(136 * treeBrightness)})`;
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

            // Calculate average position of upcoming road segments to center camera
            const lookAheadDistance = 5000; // How far ahead to look for centering
            const visibleCurveSegments = segments.filter(seg => 
                seg.p1.world.z >= cameraZ && 
                seg.p1.world.z < cameraZ + lookAheadDistance
            );
            
            // Default to 0 if no segments found
            let averageCurve = 0;
            if (visibleCurveSegments.length > 0) {
                averageCurve = visibleCurveSegments.reduce((sum, seg) => sum + seg.curve, 0) / 
                               visibleCurveSegments.length;
            }
            
            // Use this average curve as camera X position
            const currentCameraX = averageCurve;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // Background gradient colors
            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, '#242a36');
            gradient.addColorStop(0.4, '#131519');
            gradient.addColorStop(0.7, '#080809');
            gradient.addColorStop(1, '#000000');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.strokeStyle = '#90b40f'; // this does nothing.
            ctx.lineWidth = 1.5; // Increased from 1 to 1.5 for more visibility

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
                const projected1 = project(segment.p1, currentCameraX, currentCameraY, cameraZ);
                const projected2 = project(segment.p2, currentCameraX, currentCameraY, cameraZ);
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
                    ctx.strokeStyle = '#4651a8'; // Brighter center line
                    drawLine(p1.x, p1.y, p2.x, p2.y, fade * 0.9); // Increased from 0.8 to 0.9
                    // Remember to reset stroke style after
                    ctx.strokeStyle = '#171a3c';
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
                    const treeBase = { world: { x: curve - roadWidth * 1.5, y: 0, z: z }, screen: {} };
                    const treeTop = { world: { x: treeBase.world.x, y: getTreeHeight(z), z: z }, screen: {} };
                    const projectedBase = project(treeBase, currentCameraX, currentCameraY, cameraZ);
                    const projectedTop = project(treeTop, currentCameraX, currentCameraY, cameraZ);
                    if (projectedBase && projectedTop) {
                        const distanceRatio = (z - cameraZ) / visibleDistance;
                        const opacity = Math.max(0, 1 - distanceRatio * 1.2);
                        const scale = projectedBase.scale;
                        drawTree(treeBase, treeTop, scale, opacity, getTreeType(z));
                    }
                }

                // Tree on the right
                if (shouldPlaceTree(z + 500)) {
                    // Add an additional random offset for more natural placement
                    const lateralOffset = (Math.sin(z * 0.03) * 0.5 + 0.5) * 500;
                    const treeBase = { world: { x: curve + roadWidth * 1.5 + lateralOffset, y: 0, z: z }, screen: {} };
                    const treeTop = { world: { x: treeBase.world.x, y: getTreeHeight(z + 500), z: z }, screen: {} };
                    const projectedBase = project(treeBase, currentCameraX, currentCameraY, cameraZ);
                    const projectedTop = project(treeTop, currentCameraX, currentCameraY, cameraZ);
                    if (projectedBase && projectedTop) {
                        const distanceRatio = (z - cameraZ) / visibleDistance;
                        const opacity = Math.max(0, 1 - distanceRatio * 1.2);
                        const scale = projectedBase.scale;
                        drawTree(treeBase, treeTop, scale, opacity, getTreeType(z + 300));
                    }
                }

                // Add occasional forest clusters for more visual interest
                if (shouldPlaceTree(z * 1.7)) {
                    for (let i = 0; i < 3; i++) {
                        const offset = (i - 1) * 150;
                        const treeBase = { world: { x: curve - roadWidth * 3 + offset, y: 0, z: z + offset }, screen: {} };
                        const treeTop = { world: { x: treeBase.world.x, y: getTreeHeight(z + i * 200) * 0.8, z: z + offset }, screen: {} };
                        const projectedBase = project(treeBase, currentCameraX, currentCameraY, cameraZ);
                        const projectedTop = project(treeTop, currentCameraX, currentCameraY, cameraZ);
                        if (projectedBase && projectedTop) {
                            const distanceRatio = (z - cameraZ) / visibleDistance;
                            const opacity = Math.max(0, 1 - distanceRatio * 1.2) * 0.7;
                            const scale = projectedBase.scale * 0.8;
                            drawTree(treeBase, treeTop, scale, opacity, getTreeType(z + i * 100));
                        }
                    }
                }
            }

            requestAnimationFrame(render);
        }

        // **Start Animation**
        requestAnimationFrame(render);
    })();
});