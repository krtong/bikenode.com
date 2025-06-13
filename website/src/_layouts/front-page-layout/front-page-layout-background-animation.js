// Three.js hyperrealistic race track flyover animation
document.addEventListener('DOMContentLoaded', function() {
    try {
        const canvas = document.getElementById('front-page-layout-background-canvas');
        if (!canvas) {
            console.error('Canvas not found');
            return;
        }
        
        // Check if Three.js is loaded
        if (typeof THREE === 'undefined') {
            console.error('Three.js not loaded');
            return;
        }
        
        // Create scene
        const scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0x0a0f1a, 200, 2500);
        
        // Renderer setup with optimizations
        const renderer = new THREE.WebGLRenderer({ 
            canvas, 
            antialias: true,
            powerPreference: "high-performance"
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.85;
        
        // Camera with realistic FOV
        const camera = new THREE.PerspectiveCamera(
            65, // FOV
            window.innerWidth / window.innerHeight,
            0.1,
            3000
        );
        
        // Lighting setup for outdoor realism
        const ambientLight = new THREE.AmbientLight(0x404458, 0.5);
        scene.add(ambientLight);
        
        const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
        sunLight.position.set(150, 200, 100);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 500;
        sunLight.shadow.camera.left = -150;
        sunLight.shadow.camera.right = 150;
        sunLight.shadow.camera.top = 150;
        sunLight.shadow.camera.bottom = -150;
        sunLight.shadow.bias = -0.0005;
        scene.add(sunLight);
        
        // Generate realistic track spline
        const trackPoints = [];
        const segments = 120;
        for (let i = 0; i < segments; i++) {
            const t = (i / segments) * Math.PI * 2;
            
            // Complex track layout with multiple curves
            const baseRadius = 500;
            const variation = Math.sin(t * 2) * 200 + Math.cos(t * 3) * 100;
            const radius = baseRadius + variation;
            
            const x = Math.sin(t) * radius + Math.sin(t * 4) * 50;
            const z = Math.cos(t * 1.5) * radius * 0.7 + Math.cos(t * 5) * 30;
            const y = Math.sin(t * 3) * 25 + Math.cos(t * 7) * 15; // Elevation changes
            
            trackPoints.push(new THREE.Vector3(x, y, z));
        }
        
        // Create smooth spline curve
        const curve = new THREE.CatmullRomCurve3(trackPoints, true, 'centripetal', 0.5);
        curve.arcLengthDivisions = 2000;
        
        // Track materials
        const asphaltMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            roughness: 0.85,
            metalness: 0.1,
            envMapIntensity: 0.5
        });
        
        // Create track mesh using TubeGeometry
        const trackRadius = 12; // 24m wide track
        const trackGeometry = new THREE.TubeGeometry(curve, 2000, trackRadius, 8, true);
        const track = new THREE.Mesh(trackGeometry, asphaltMaterial);
        track.receiveShadow = true;
        scene.add(track);
        
        // Add track center line
        const centerLineGeometry = new THREE.TubeGeometry(curve, 2000, 0.3, 4, true);
        const centerLineMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffff00,
            emissive: 0xffff00,
            emissiveIntensity: 0.5
        });
        const centerLine = new THREE.Mesh(centerLineGeometry, centerLineMaterial);
        scene.add(centerLine);
        
        // Ground terrain
        const terrainGeometry = new THREE.PlaneGeometry(3000, 3000, 100, 100);
        const terrainMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x0a1a0a,
            roughness: 0.95
        });
        
        // Add some terrain displacement for realism
        const vertices = terrainGeometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const z = vertices[i + 2];
            const distance = Math.sqrt(x * x + z * z);
            vertices[i + 1] = Math.sin(distance * 0.01) * 5 + Math.random() * 2;
        }
        terrainGeometry.computeVertexNormals();
        
        const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
        terrain.rotation.x = -Math.PI / 2;
        terrain.position.y = -20;
        terrain.receiveShadow = true;
        scene.add(terrain);
        
        // Add kerbs to track
        const kerbSegments = 100;
        for (let i = 0; i < kerbSegments; i++) {
            const t = i / kerbSegments;
            const pos = curve.getPointAt(t);
            const tangent = curve.getTangentAt(t);
            const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
            
            // Only add kerbs on sharp corners
            const nextT = (i + 1) / kerbSegments;
            const nextTangent = curve.getTangentAt(nextT);
            const curvature = tangent.angleTo(nextTangent);
            
            if (curvature > 0.02) {
                // Left kerb
                const leftKerb = new THREE.BoxGeometry(4, 0.5, 1);
                const kerbMaterial = new THREE.MeshStandardMaterial({
                    color: i % 2 === 0 ? 0xff0000 : 0xffffff
                });
                const leftKerbMesh = new THREE.Mesh(leftKerb, kerbMaterial);
                leftKerbMesh.position.copy(pos).add(normal.clone().multiplyScalar(trackRadius + 2));
                leftKerbMesh.lookAt(pos.clone().add(tangent));
                leftKerbMesh.castShadow = true;
                scene.add(leftKerbMesh);
                
                // Right kerb
                const rightKerbMesh = new THREE.Mesh(leftKerb, kerbMaterial);
                rightKerbMesh.position.copy(pos).add(normal.clone().multiplyScalar(-trackRadius - 2));
                rightKerbMesh.lookAt(pos.clone().add(tangent));
                rightKerbMesh.castShadow = true;
                scene.add(rightKerbMesh);
            }
        }
        
        // Add trackside objects (trees, barriers)
        const treeGeometry = new THREE.ConeGeometry(6, 20, 8);
        const treeMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x0a4020,
            roughness: 0.8
        });
        
        const treeInstances = 200;
        const treeMatrix = new THREE.Matrix4();
        const treeMesh = new THREE.InstancedMesh(treeGeometry, treeMaterial, treeInstances);
        treeMesh.castShadow = true;
        treeMesh.receiveShadow = true;
        
        for (let i = 0; i < treeInstances; i++) {
            const t = i / treeInstances;
            const pos = curve.getPointAt(t);
            const tangent = curve.getTangentAt(t);
            const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
            
            const side = Math.random() > 0.5 ? 1 : -1;
            const distance = trackRadius + 20 + Math.random() * 50;
            
            treeMatrix.makeTranslation(
                pos.x + normal.x * distance * side,
                10,
                pos.z + normal.z * distance * side
            );
            treeMesh.setMatrixAt(i, treeMatrix);
        }
        scene.add(treeMesh);
        
        // Camera physics variables
        let cameraDistance = 0;
        let velocity = 50 / 3.6; // Start at 50 km/h (m/s)
        const maxVelocity = 250 / 3.6; // Max 250 km/h
        const acceleration = 4.5; // m/s²
        const drag = 0.4; // Drag coefficient
        const cameraHeight = 1.8; // Camera height above track
        const lookAheadTime = 0.45; // seconds
        
        // Get total track length
        const trackLength = curve.getLength();
        
        // Helper function: distance to curve parameter
        function distanceToU(distance) {
            const normalizedDistance = (distance % trackLength + trackLength) % trackLength;
            return normalizedDistance / trackLength;
        }
        
        // Animation variables
        const clock = new THREE.Clock();
        let previousCameraPos = new THREE.Vector3();
        let cameraRoll = 0;
        let cameraPitch = 0;
        
        // Main animation loop
        function animate() {
            requestAnimationFrame(animate);
            
            const deltaTime = Math.min(clock.getDelta(), 0.1);
            
            // Update velocity with realistic physics
            const dragForce = drag * Math.pow(velocity / 55.5, 2);
            const netAcceleration = acceleration - dragForce;
            velocity = Math.min(maxVelocity, velocity + netAcceleration * deltaTime);
            
            // Update distance traveled
            cameraDistance += velocity * deltaTime;
            
            // Get current position on track
            const currentU = distanceToU(cameraDistance);
            const currentPos = curve.getPointAt(currentU);
            const currentTangent = curve.getTangentAt(currentU);
            
            // Look ahead position
            const lookAheadDistance = cameraDistance + velocity * lookAheadTime;
            const lookAheadU = distanceToU(lookAheadDistance);
            const lookAheadPos = curve.getPointAt(lookAheadU);
            
            // Calculate lateral acceleration for banking
            const deltaPos = currentPos.clone().sub(previousCameraPos);
            const lateralAccel = deltaPos.length() > 0 ? 
                deltaPos.normalize().cross(currentTangent).length() * velocity * velocity / deltaTime : 0;
            
            // Update camera roll based on lateral G-force
            const targetRoll = -lateralAccel * 0.00015;
            cameraRoll += (targetRoll - cameraRoll) * 0.1;
            
            // Position camera with slight lag for realism
            const cameraLagDistance = cameraDistance - velocity * 0.05;
            const cameraU = distanceToU(cameraLagDistance);
            const cameraTrackPos = curve.getPointAt(cameraU);
            
            camera.position.copy(cameraTrackPos);
            camera.position.y += cameraHeight;
            
            // Add subtle camera shake based on speed
            const shake = (velocity / maxVelocity) * 0.2;
            camera.position.x += (Math.random() - 0.5) * shake;
            camera.position.y += (Math.random() - 0.5) * shake * 0.3;
            
            // Look at with banking
            camera.up.set(Math.sin(cameraRoll), Math.cos(cameraRoll), 0);
            camera.lookAt(lookAheadPos);
            
            previousCameraPos.copy(currentPos);
            
            // Update sun position for dynamic lighting
            const timeOfDay = Date.now() * 0.00001;
            sunLight.position.x = Math.cos(timeOfDay) * 150;
            sunLight.position.y = 200 + Math.sin(timeOfDay) * 50;
            
            // Render
            renderer.render(scene, camera);
        }
        
        // Handle window resize
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
        
        // Start animation
        animate();
        
        console.log('Three.js hyperrealistic track flyover initialized');
        
    } catch (error) {
        console.error('Error initializing Three.js animation:', error);
        // Fallback to simple 2D animation if Three.js fails
        fallbackTo2DAnimation();
    }
});

// Fallback 2D animation if Three.js fails
function fallbackTo2DAnimation() {
    const canvas = document.getElementById('front-page-layout-background-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    window.addEventListener('resize', resize);
    resize();
    
    // Simple animated gradient background
    let time = 0;
    
    function animate() {
        time += 0.01;
        
        // Create animated gradient
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        const hue = (Math.sin(time) * 30 + 200) % 360;
        gradient.addColorStop(0, `hsl(${hue}, 20%, 10%)`);
        gradient.addColorStop(0.5, `hsl(${hue + 20}, 25%, 15%)`);
        gradient.addColorStop(1, `hsl(${hue + 40}, 20%, 8%)`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add some moving particles
        ctx.fillStyle = 'rgba(88, 101, 242, 0.3)';
        for (let i = 0; i < 50; i++) {
            const x = (Math.sin(time + i) * 0.5 + 0.5) * canvas.width;
            const y = ((time * 50 + i * 20) % canvas.height);
            const size = Math.sin(time + i * 0.5) * 2 + 3;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        requestAnimationFrame(animate);
    }
    
    animate();
    console.log('Fallback 2D animation initialized');
}