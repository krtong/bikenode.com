// background.js
document.addEventListener('DOMContentLoaded', function() {
    (function() {
        // Get canvas and context
        const canvas = document.getElementById('backgroundCanvas');
        if (!canvas) {
            console.error('Canvas element not found');
            return;
        }
        const ctx = canvas.getContext('2d');

        // Resize canvas to fit window
        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        // Configuration constants
        const segmentLength = 100;
        const roadWidth = 2000;
        const segmentCount = 400;
        const cameraHeight = 1000;
        const fov = 100;
        const visibleDistance = 20000;
        let cameraZ = 0;
        const segments = [];

        // Speed control
        const baseSpeed = 3000; // units per second
        const variation = 500;  // units per second
        let lastTime = 0;

        // Procedural generation functions
        function hash(z) {
            return Math.sin(z * 12.9898) * 43758.5453;
        }

        function shouldPlaceTree(z) {
            return (hash(z) % 1) > 0.7;
        }

        function getTreeHeight(z) {
            return 400 + ((hash(z + 1000) % 1) - 0.5) * 200;
        }

        // Generate road segments with curves and hills
        for (let i = 0; i < segmentCount; i++) {
            const t = (i / segmentCount) * 2 * Math.PI;
            const noise = Math.sin(t * 5) * 200;
            segments.push({
                index: i,
                p1: { world: { x: 0, y: 0, z: i * segmentLength }, screen: {} },
                p2: { world: { x: 0, y: 0, z: (i + 1) * segmentLength }, screen: {} },
                curve: Math.sin(t) * 1200 + noise,
                hill: Math.cos(t) * 600 + noise * 0.5
            });
        }

        // Project 3D points to 2D screen coordinates
        function project(point, camX, camY, camZ) {
            const dx = point.world.x - camX;
            const dy = point.world.y - camY;
            const dz = point.world.z - camZ;
            const scale = fov / (dz > 0 ? dz : 0.001);
            point.screen.x = canvas.width / 2 + scale * dx;
            point.screen.y = canvas.height / 2 - scale * dy;
            point.screen.scale = scale;
        }

        // Draw a line with specified opacity
        function drawLine(x1, y1, x2, y2, alpha = 1) {
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }

        // Render the scene
        function render(timestamp) {
            if (lastTime === 0) lastTime = timestamp;
            const deltaTime = (timestamp - lastTime) / 1000;
            lastTime = timestamp;
            const speed = baseSpeed + Math.sin(timestamp * 0.001) * variation;
            cameraZ += speed * deltaTime;
            if (cameraZ >= segmentCount * segmentLength) {
                cameraZ -= segmentCount * segmentLength;
            }

            // Clear canvas and draw gradient background
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, '#2a2d34');
            gradient.addColorStop(0.5, '#1a1c1f');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.strokeStyle = '#5865F2';
            ctx.lineWidth = 1;

            // Set shadow for road lines
            ctx.shadowColor = 'rgba(88, 101, 242, 0.5)';
            ctx.shadowBlur = 5;

            const baseSegmentIdx = Math.floor(cameraZ / segmentLength) % segmentCount;

            // Draw road segments back to front
            for (let i = segmentCount - 1; i >= 0; i--) {
                const idx = (baseSegmentIdx + i) % segmentCount;
                const segment = segments[idx];
                const nextSegment = segments[(segment.index + 1) % segmentCount];

                segment.p1.world.x = segment.curve;
                segment.p1.world.y = segment.hill;
                segment.p2.world.x = nextSegment.curve;
                segment.p2.world.y = nextSegment.hill;

                project(segment.p1, 0, cameraHeight, cameraZ);
                project(segment.p2, 0, cameraHeight, cameraZ);

                if (segment.p1.screen.scale <= 0) continue;

                const p1 = segment.p1.screen;
                const p2 = segment.p2.screen;
                const fade = 1; // Full opacity

                const width1 = (roadWidth / 2) * p1.scale;
                const width2 = (roadWidth / 2) * p2.scale;

                drawLine(p1.x - width1, p1.y, p2.x - width2, p2.y, fade); // Left edge
                drawLine(p1.x + width1, p1.y, p2.x + width2, p2.y, fade); // Right edge

                const midZ = (segment.p1.world.z + segment.p2.world.z) / 2;
                if (Math.floor(midZ / 200) % 2 === 0) {
                    drawLine(p1.x, p1.y, p2.x, p2.y, fade); // Center line
                }
            }

            // Reset shadow for trees
            ctx.shadowBlur = 0;

            // Draw trees
            const startZ = Math.floor(cameraZ / 100) * 100;
            const endZ = cameraZ + visibleDistance;
            for (let z = startZ; z < endZ; z += 100) {
                const segmentIdx = Math.floor(z / segmentLength) % segmentCount;
                const segment = segments[segmentIdx];
                const curve = segment.curve;

                if (shouldPlaceTree(z)) {
                    const treeBase = { world: { x: curve - roadWidth * 1.5, y: 0, z: z }, screen: {} };
                    const treeTop = { world: { x: treeBase.world.x, y: getTreeHeight(z), z: z }, screen: {} };
                    project(treeBase, 0, cameraHeight, cameraZ);
                    project(treeTop, 0, cameraHeight, cameraZ);
                    if (treeBase.screen.scale > 0) {
                        drawLine(treeBase.screen.x, treeBase.screen.y, treeTop.screen.x, treeTop.screen.y, 1);
                    }
                }
                if (shouldPlaceTree(z + 500)) {
                    const treeBase = { world: { x: curve + roadWidth * 1.5, y: 0, z: z }, screen: {} };
                    const treeTop = { world: { x: treeBase.world.x, y: getTreeHeight(z + 500), z: z }, screen: {} };
                    project(treeBase, 0, cameraHeight, cameraZ);
                    project(treeTop, 0, cameraHeight, cameraZ);
                    if (treeBase.screen.scale > 0) {
                        drawLine(treeBase.screen.x, treeBase.screen.y, treeTop.screen.x, treeTop.screen.y, 1);
                    }
                }
            }

            // Continue animation loop
            requestAnimationFrame(render);
        }

        // Start the animation
        requestAnimationFrame(render);
    })();
});