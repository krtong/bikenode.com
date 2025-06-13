document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('front-page-layout-background-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    window.addEventListener('resize', resize);
    resize();
    
    // Game state
    let position = 0;
    let speed = 0;
    let maxSpeed = 200;
    let acceleration = 100;
    let breaking = 300;
    let deceleration = 50;
    let playerX = 0;
    let dx = 0; // horizontal speed
    
    // Track mouse/keyboard for steering
    let keyLeft = false;
    let keyRight = false;
    let keyUp = false;
    let keyDown = false;
    
    document.addEventListener('keydown', (e) => {
        switch(e.key) {
            case 'ArrowLeft': keyLeft = true; break;
            case 'ArrowRight': keyRight = true; break;
            case 'ArrowUp': keyUp = true; break;
            case 'ArrowDown': keyDown = true; break;
        }
    });
    
    document.addEventListener('keyup', (e) => {
        switch(e.key) {
            case 'ArrowLeft': keyLeft = false; break;
            case 'ArrowRight': keyRight = false; break;
            case 'ArrowUp': keyUp = false; break;
            case 'ArrowDown': keyDown = false; break;
        }
    });
    
    // Also track mouse
    let mouseX = canvas.width / 2;
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
    });
    
    // Road segments
    const segmentLength = 200;
    const rumbleLength = 3;
    const roadWidth = 2000;
    const lanes = 3;
    
    // Build track
    const trackLength = 500;
    const segments = [];
    
    function addRoad(enter, hold, leave, curve, y) {
        const startY = segments.length > 0 ? segments[segments.length - 1].p2.world.y : 0;
        const endY = startY + y * segmentLength;
        const total = enter + hold + leave;
        
        for (let n = 0; n < enter; n++) {
            segments.push({
                index: segments.length,
                p1: { world: { y: startY + (endY - startY) * (n / total), z: (segments.length) * segmentLength }, camera: {}, screen: {} },
                p2: { world: { y: startY + (endY - startY) * ((n + 1) / total), z: (segments.length + 1) * segmentLength }, camera: {}, screen: {} },
                curve: curve * (n / enter),
                sprites: [],
                cars: []
            });
        }
        
        for (let n = 0; n < hold; n++) {
            segments.push({
                index: segments.length,
                p1: { world: { y: startY + (endY - startY) * ((enter + n) / total), z: (segments.length) * segmentLength }, camera: {}, screen: {} },
                p2: { world: { y: startY + (endY - startY) * ((enter + n + 1) / total), z: (segments.length + 1) * segmentLength }, camera: {}, screen: {} },
                curve: curve,
                sprites: [],
                cars: []
            });
        }
        
        for (let n = 0; n < leave; n++) {
            segments.push({
                index: segments.length,
                p1: { world: { y: startY + (endY - startY) * ((enter + hold + n) / total), z: (segments.length) * segmentLength }, camera: {}, screen: {} },
                p2: { world: { y: startY + (endY - startY) * ((enter + hold + n + 1) / total), z: (segments.length + 1) * segmentLength }, camera: {}, screen: {} },
                curve: curve * ((leave - n) / leave),
                sprites: [],
                cars: []
            });
        }
    }
    
    // Build a pseudo-random track
    addRoad(10, 10, 10, 0, 0);     // Start straight
    addRoad(10, 10, 10, 5, 0);     // Right curve
    addRoad(10, 10, 10, 0, 0);     // Straight
    addRoad(10, 10, 10, -5, 0);    // Left curve
    addRoad(10, 10, 10, 0, 10);    // Up hill
    addRoad(10, 10, 10, 3, 0);     // Right curve on hill
    addRoad(10, 10, 10, 0, -10);   // Down hill
    addRoad(10, 10, 10, -3, 0);    // Left curve
    addRoad(10, 10, 10, 0, 0);     // Straight
    addRoad(10, 10, 10, 5, 5);     // Right curve up hill
    addRoad(10, 10, 10, -5, -5);   // Left curve down hill
    addRoad(10, 10, 10, 0, 0);     // Straight to finish
    
    // Add sprites (trees, signs, buildings)
    segments[10].sprites.push({ source: 'tree', offset: -2.5 });
    segments[10].sprites.push({ source: 'tree', offset: 2.5 });
    segments[20].sprites.push({ source: 'sign', offset: -2.5 });
    segments[30].sprites.push({ source: 'tree', offset: 2.5 });
    segments[40].sprites.push({ source: 'tree', offset: -2.5 });
    segments[40].sprites.push({ source: 'tree', offset: 2.5 });
    segments[60].sprites.push({ source: 'sign', offset: 2.5 });
    segments[80].sprites.push({ source: 'tree', offset: -2.5 });
    segments[100].sprites.push({ source: 'sign', offset: -2.5 });
    
    // Loop track
    segments[segments.length - 1].p2.world.z = 0;
    const trackDistance = segments.length * segmentLength;
    
    // Add other cars
    for (let n = 0; n < 200; n += 20) {
        const idx = Math.floor(n / segmentLength) % segments.length;
        segments[idx].cars.push({
            offset: (Math.random() - 0.5) * 0.8,
            z: n * segmentLength,
            speed: 80 + Math.random() * 40
        });
    }
    
    // Colors and rendering
    const COLORS = {
        SKY: '#72D7EE',
        TREE: '#005108',
        FOG: '#72D7EE',
        LIGHT: { road: '#6B6B6B', grass: '#10AA10', rumble: '#555555', lane: '#CCCCCC' },
        DARK: { road: '#696969', grass: '#009A00', rumble: '#BBBBBB', lane: '#CCCCCC' }
    };
    
    function project(p, cameraX, cameraY, cameraZ, cameraDepth, width, height, roadWidth) {
        p.camera.x = p.world.x - cameraX;
        p.camera.y = p.world.y - cameraY;
        p.camera.z = p.world.z - cameraZ;
        p.screen.scale = cameraDepth / p.camera.z;
        p.screen.x = Math.round((width / 2) + (p.screen.scale * p.camera.x * width / 2));
        p.screen.y = Math.round((height / 2) - (p.screen.scale * p.camera.y * height / 2));
        p.screen.w = Math.round((p.screen.scale * roadWidth * width / 2));
    }
    
    function drawSegment(ctx, width, segments, index, colors, cameraX, cameraY, cameraZ, cameraDepth) {
        const seg = segments[index];
        const rumbleWidth = seg.p1.screen.w / 5;
        const laneMarkerWidth = seg.p1.screen.w / 20;
        
        // Grass
        ctx.fillStyle = colors.grass;
        ctx.fillRect(0, seg.p2.screen.y, width, seg.p1.screen.y - seg.p2.screen.y);
        
        // Rumble strips
        const x1 = seg.p1.screen.x - seg.p1.screen.w - rumbleWidth;
        const x2 = seg.p1.screen.x - seg.p1.screen.w;
        const x3 = seg.p1.screen.x + seg.p1.screen.w;
        const x4 = seg.p1.screen.x + seg.p1.screen.w + rumbleWidth;
        
        ctx.fillStyle = colors.rumble;
        ctx.fillRect(x1, seg.p2.screen.y, x2 - x1, seg.p1.screen.y - seg.p2.screen.y);
        ctx.fillRect(x3, seg.p2.screen.y, x4 - x3, seg.p1.screen.y - seg.p2.screen.y);
        
        // Road
        ctx.fillStyle = colors.road;
        ctx.fillRect(seg.p1.screen.x - seg.p1.screen.w, seg.p2.screen.y, 
                    seg.p1.screen.w * 2, seg.p1.screen.y - seg.p2.screen.y);
        
        // Lane markers
        if (colors.lane) {
            const laneW = seg.p1.screen.w * 2 / lanes;
            const laneX = seg.p1.screen.x - seg.p1.screen.w + laneW;
            
            ctx.fillStyle = colors.lane;
            for (let lane = 1; lane < lanes; lane++) {
                ctx.fillRect(laneX + laneW * (lane - 1) - laneMarkerWidth / 2, seg.p2.screen.y,
                           laneMarkerWidth, seg.p1.screen.y - seg.p2.screen.y);
            }
        }
    }
    
    function drawSprite(ctx, width, height, resolution, roadWidth, sprites, sprite, scale, destX, destY, steer, updown) {
        const destW = (sprite.w * scale * width / 2) * (resolution / 480);
        const destH = (sprite.h * scale * width / 2) * (resolution / 480);
        
        destX += destW * steer;
        destY += destH * updown;
        
        const clipH = destY + destH - height;
        if (clipH < 0) clipH = 0;
        if (clipH >= destH) return;
        
        // Draw sprite based on type
        ctx.save();
        
        if (sprite.source === 'tree') {
            // Draw a simple tree
            ctx.fillStyle = '#654321';
            ctx.fillRect(destX - destW/8, destY - destH + destH/4, destW/4, destH * 3/4);
            ctx.fillStyle = COLORS.TREE;
            ctx.beginPath();
            ctx.moveTo(destX, destY - destH);
            ctx.lineTo(destX - destW/2, destY - destH/3);
            ctx.lineTo(destX + destW/2, destY - destH/3);
            ctx.closePath();
            ctx.fill();
        } else if (sprite.source === 'sign') {
            // Draw a road sign
            ctx.fillStyle = '#FFFF00';
            ctx.fillRect(destX - destW/2, destY - destH, destW, destH/2);
            ctx.fillStyle = '#000000';
            ctx.fillRect(destX - 2, destY - destH/2, 4, destH/2);
        } else if (sprite.source === 'car') {
            // Draw other cars
            ctx.fillStyle = sprite.color || '#FF0000';
            ctx.fillRect(destX - destW/2, destY - destH, destW, destH);
            // Windows
            ctx.fillStyle = '#333333';
            ctx.fillRect(destX - destW/3, destY - destH + destH/6, destW * 2/3, destH/3);
        }
        
        ctx.restore();
    }
    
    function drawPlayer(ctx, width, height, resolution, roadWidth, sprites, scale, destX, destY, steer, updown) {
        const destW = 80 * scale * width / 2 * (resolution / 480);
        const destH = 41 * scale * width / 2 * (resolution / 480);
        
        // Draw player car at bottom of screen
        ctx.save();
        ctx.fillStyle = '#0066FF';
        ctx.fillRect(width/2 + destX - destW/2, height - destH - 10, destW, destH);
        // Windshield
        ctx.fillStyle = '#003366';
        ctx.fillRect(width/2 + destX - destW/3, height - destH - 10 + 5, destW * 2/3, destH/3);
        ctx.restore();
    }
    
    let lastTime = 0;
    function update(dt) {
        const step = dt / 1000; // Convert to seconds
        
        // Update position based on speed
        position += speed * step;
        
        // Keep position on track
        while (position >= trackDistance) position -= trackDistance;
        while (position < 0) position += trackDistance;
        
        // Speed control
        if (keyUp || mouseX < canvas.width * 0.3 || mouseX > canvas.width * 0.7)
            speed = Math.min(speed + acceleration * step, maxSpeed);
        else if (keyDown)
            speed = Math.max(speed - breaking * step, 0);
        else
            speed = Math.max(speed - deceleration * step, 0);
        
        // Steering
        if (keyLeft || mouseX < canvas.width * 0.4)
            dx = Math.max(dx - 2000 * step, -3000);
        else if (keyRight || mouseX > canvas.width * 0.6)
            dx = Math.min(dx + 2000 * step, 3000);
        else
            dx = dx * Math.pow(0.9, step * 10);
        
        playerX += dx * step * speed / maxSpeed;
        
        // Update other cars
        segments.forEach(segment => {
            segment.cars.forEach(car => {
                car.z += car.speed * step * 100;
                while (car.z >= trackDistance) car.z -= trackDistance;
            });
        });
    }
    
    function render(timestamp) {
        const dt = Math.min(timestamp - lastTime, 100); // Cap at 100ms
        lastTime = timestamp;
        
        update(dt);
        
        // Clear and sky
        ctx.fillStyle = COLORS.SKY;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Hills (simple parallax background)
        ctx.fillStyle = '#8DB359';
        ctx.fillRect(0, canvas.height / 2, canvas.width, canvas.height / 2);
        
        // Calculate camera
        const baseSegment = Math.floor(position / segmentLength);
        const basePercent = (position % segmentLength) / segmentLength;
        const playerSegment = segments[baseSegment % segments.length];
        const cameraHeight = 1000 + playerSegment.p1.world.y;
        const resolution = canvas.height;
        const fieldOfView = 100;
        const cameraDepth = 1 / Math.tan((fieldOfView / 2) * Math.PI / 180);
        const drawDistance = 300;
        
        let maxy = canvas.height;
        let x = 0;
        let dx = -(playerSegment.curve * basePercent);
        
        // Render road segments
        for (let n = 0; n < drawDistance; n++) {
            const segIndex = (baseSegment + n) % segments.length;
            const segment = segments[segIndex];
            
            segment.p1.world.x = x;
            segment.p2.world.x = x + dx;
            x = x + dx;
            dx = dx + segment.curve;
            
            segment.p1.camera = {};
            segment.p2.camera = {};
            segment.p1.screen = {};
            segment.p2.screen = {};
            
            const offset = segment.index < baseSegment ? trackDistance : 0;
            
            project(segment.p1, playerX * roadWidth - x, cameraHeight, position - (n > 0 ? segmentLength : 0) + offset, cameraDepth, canvas.width, canvas.height, roadWidth);
            project(segment.p2, playerX * roadWidth - x - dx, cameraHeight, position + offset, cameraDepth, canvas.width, canvas.height, roadWidth);
            
            if ((segment.p1.camera.z <= cameraDepth) || (segment.p2.screen.y >= maxy))
                continue;
            
            const colors = (Math.floor(segIndex / rumbleLength) % 2) ? COLORS.DARK : COLORS.LIGHT;
            colors.lane = ((segIndex / 2) % 2) ? colors.lane : null;
            
            drawSegment(ctx, canvas.width, segments, segIndex, colors, playerX * roadWidth, cameraHeight, position, cameraDepth);
            maxy = segment.p2.screen.y;
        }
        
        // Render sprites and cars back to front
        for (let n = drawDistance - 1; n > 0; n--) {
            const segIndex = (baseSegment + n) % segments.length;
            const segment = segments[segIndex];
            
            // Sprites
            segment.sprites.forEach(sprite => {
                const spriteScale = segment.p1.screen.scale;
                const spriteX = segment.p1.screen.x + (spriteScale * sprite.offset * roadWidth * canvas.width / 2);
                const spriteY = segment.p1.screen.y;
                
                drawSprite(ctx, canvas.width, canvas.height, resolution, roadWidth, null,
                    { source: sprite.source, w: 80, h: 80 },
                    spriteScale * 3, spriteX, spriteY, sprite.offset < 0 ? -1 : 0, -1);
            });
            
            // Cars
            segment.cars.forEach(car => {
                const percent = (car.z % segmentLength) / segmentLength;
                const spriteScale = segment.p1.screen.scale * (1 - percent) + segment.p2.screen.scale * percent;
                const spriteX = segment.p1.screen.x * (1 - percent) + segment.p2.screen.x * percent;
                const spriteY = segment.p1.screen.y * (1 - percent) + segment.p2.screen.y * percent;
                
                drawSprite(ctx, canvas.width, canvas.height, resolution, roadWidth, null,
                    { source: 'car', w: 60, h: 30, color: '#' + Math.floor(Math.random()*16777215).toString(16) },
                    spriteScale * 2, spriteX + car.offset * roadWidth * spriteScale * canvas.width / 2, 
                    spriteY, 0, -0.5);
            });
        }
        
        // Draw player car
        drawPlayer(ctx, canvas.width, canvas.height, resolution, roadWidth, null, 
                  1, playerX * 100, 0, 0, 0);
        
        // HUD
        ctx.fillStyle = '#000000';
        ctx.fillRect(10, 10, 200, 60);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 16px monospace';
        ctx.fillText('Speed: ' + Math.round(speed), 20, 35);
        ctx.fillText('Position: ' + Math.round(position / 100), 20, 55);
        
        requestAnimationFrame(render);
    }
    
    console.log('Arcade racing game initialized');
    requestAnimationFrame(render);
});