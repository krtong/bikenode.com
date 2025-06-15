# Real-Time Data Synchronization Architecture

## Overview
A comprehensive real-time sync system that keeps data consistent across multiple devices, enables live tracking, and supports collaborative features.

## Core Sync Components

### WebSocket Infrastructure
- **Connection Management**
  ```javascript
  // Client connection with auto-reconnect
  class BikenodeSocket {
    constructor() {
      this.ws = null;
      this.reconnectDelay = 1000;
      this.maxReconnectDelay = 30000;
      this.messageQueue = [];
    }

    connect() {
      this.ws = new WebSocket('wss://realtime.bikenode.com');
      this.ws.on('open', () => this.handleOpen());
      this.ws.on('close', () => this.handleReconnect());
      this.ws.on('message', (data) => this.handleMessage(data));
    }

    handleReconnect() {
      setTimeout(() => {
        this.reconnectDelay = Math.min(
          this.reconnectDelay * 2, 
          this.maxReconnectDelay
        );
        this.connect();
      }, this.reconnectDelay);
    }
  }
  ```

- **Server Architecture**
  ```yaml
  Load Balancer:
    - Sticky sessions via user ID
    - Health check endpoints
    - SSL termination
    - DDoS protection

  WebSocket Servers:
    - Horizontal scaling (100k connections/server)
    - Redis pub/sub for inter-server comm
    - Graceful shutdown handling
    - Connection state persistence

  Message Broker:
    - Redis Streams for reliability
    - Kafka for high throughput
    - RabbitMQ for complex routing
    - Message persistence
  ```

### Sync Protocols

#### Conflict-Free Replicated Data Types (CRDTs)
- **Last-Write-Wins Register**
  ```javascript
  class LWWRegister {
    constructor(id) {
      this.id = id;
      this.value = null;
      this.timestamp = 0;
      this.nodeId = generateNodeId();
    }

    set(value) {
      const timestamp = Date.now();
      this.value = value;
      this.timestamp = timestamp;
      return {
        op: 'set',
        id: this.id,
        value,
        timestamp,
        nodeId: this.nodeId
      };
    }

    merge(remote) {
      if (remote.timestamp > this.timestamp ||
          (remote.timestamp === this.timestamp && 
           remote.nodeId > this.nodeId)) {
        this.value = remote.value;
        this.timestamp = remote.timestamp;
      }
    }
  }
  ```

- **Grow-Only Set for Routes**
  ```javascript
  class RouteGSet {
    constructor() {
      this.waypoints = new Set();
      this.metadata = new Map();
    }

    addWaypoint(point) {
      const id = generatePointId(point);
      this.waypoints.add(id);
      this.metadata.set(id, {
        ...point,
        timestamp: Date.now()
      });
      return { op: 'add', id, point };
    }

    merge(remote) {
      remote.waypoints.forEach(id => {
        this.waypoints.add(id);
        if (remote.metadata.has(id)) {
          this.metadata.set(id, remote.metadata.get(id));
        }
      });
    }
  }
  ```

### Operational Transform
- **Collaborative Ride Planning**
  ```javascript
  class RouteOT {
    constructor() {
      this.operations = [];
      this.version = 0;
    }

    // Transform operation against concurrent operation
    transform(op1, op2) {
      if (op1.type === 'insert' && op2.type === 'insert') {
        if (op1.position < op2.position) {
          return { ...op2, position: op2.position + 1 };
        } else if (op1.position > op2.position) {
          return { ...op1, position: op1.position + 1 };
        } else {
          // Same position - use ID for deterministic ordering
          return op1.id < op2.id ? 
            { ...op2, position: op2.position + 1 } : 
            { ...op1, position: op1.position + 1 };
        }
      }
      // Handle other operation types...
    }

    apply(operation) {
      // Apply operation to local state
      this.operations.push(operation);
      this.version++;
      this.broadcast(operation);
    }
  }
  ```

## Real-Time Features

### Live Ride Tracking
- **GPS Stream Processing**
  ```javascript
  class LiveTracker {
    constructor(rideId) {
      this.rideId = rideId;
      this.buffer = [];
      this.batchSize = 10;
      this.flushInterval = 5000;
    }

    trackPosition(position) {
      this.buffer.push({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        altitude: position.coords.altitude,
        speed: position.coords.speed,
        heading: position.coords.heading,
        accuracy: position.coords.accuracy,
        timestamp: Date.now()
      });

      if (this.buffer.length >= this.batchSize) {
        this.flush();
      }
    }

    flush() {
      if (this.buffer.length === 0) return;

      const batch = this.buffer.splice(0);
      this.send({
        type: 'position_batch',
        rideId: this.rideId,
        points: this.compress(batch)
      });
    }

    compress(points) {
      // Delta compression for efficient transmission
      const compressed = [points[0]];
      for (let i = 1; i < points.length; i++) {
        compressed.push({
          dLat: points[i].lat - points[i-1].lat,
          dLng: points[i].lng - points[i-1].lng,
          dAlt: points[i].altitude - points[i-1].altitude,
          speed: points[i].speed,
          dt: points[i].timestamp - points[i-1].timestamp
        });
      }
      return compressed;
    }
  }
  ```

- **Viewer Experience**
  ```javascript
  class LiveRideViewer {
    constructor(rideId) {
      this.rideId = rideId;
      this.positions = [];
      this.interpolator = new PositionInterpolator();
      this.subscribe();
    }

    subscribe() {
      socket.on(`ride:${this.rideId}:position`, (data) => {
        const positions = this.decompress(data.points);
        this.positions.push(...positions);
        this.updateMap();
      });
    }

    updateMap() {
      // Smooth animation between points
      const current = this.positions[this.positions.length - 1];
      const previous = this.positions[this.positions.length - 2];
      
      if (previous) {
        this.interpolator.animate(previous, current, (pos) => {
          this.marker.setPosition(pos);
          this.updateStats(pos);
        });
      }
    }
  }
  ```

### Group Ride Coordination
- **Real-Time Formation Tracking**
  ```javascript
  class GroupRideSync {
    constructor(groupId) {
      this.groupId = groupId;
      this.members = new Map();
      this.formations = [];
    }

    updateMemberPosition(memberId, position) {
      this.members.set(memberId, {
        ...position,
        lastUpdate: Date.now()
      });

      this.calculateFormation();
      this.detectSplits();
      this.broadcastUpdate();
    }

    calculateFormation() {
      const positions = Array.from(this.members.values());
      
      // Calculate center of mass
      const center = positions.reduce((acc, pos) => ({
        lat: acc.lat + pos.lat / positions.length,
        lng: acc.lng + pos.lng / positions.length
      }), { lat: 0, lng: 0 });

      // Calculate spread
      const distances = positions.map(pos => 
        haversineDistance(center, pos)
      );
      
      this.formation = {
        center,
        spread: Math.max(...distances),
        memberCount: positions.length
      };
    }

    detectSplits() {
      // Detect if group has split
      const clusters = this.clusterMembers();
      if (clusters.length > 1) {
        this.emit('group:split', {
          groupId: this.groupId,
          clusters: clusters.map(c => ({
            members: c.members,
            center: c.center
          }))
        });
      }
    }
  }
  ```

## Offline Sync

### Client-Side Storage
- **IndexedDB Schema**
  ```javascript
  const dbSchema = {
    rides: {
      keyPath: 'id',
      indexes: [
        { name: 'syncStatus', keyPath: 'syncStatus' },
        { name: 'modified', keyPath: 'modifiedAt' }
      ]
    },
    pendingSync: {
      keyPath: 'id',
      indexes: [
        { name: 'timestamp', keyPath: 'timestamp' },
        { name: 'type', keyPath: 'operationType' }
      ]
    },
    conflicts: {
      keyPath: 'id',
      indexes: [
        { name: 'resolved', keyPath: 'resolved' }
      ]
    }
  };
  ```

- **Sync Queue Management**
  ```javascript
  class SyncQueue {
    constructor() {
      this.queue = [];
      this.processing = false;
      this.online = navigator.onLine;
    }

    async addOperation(operation) {
      const op = {
        id: generateId(),
        timestamp: Date.now(),
        operation,
        retries: 0,
        maxRetries: 3
      };

      await this.persistOperation(op);
      
      if (this.online) {
        this.process();
      }
    }

    async process() {
      if (this.processing) return;
      this.processing = true;

      while (this.queue.length > 0) {
        const op = this.queue[0];
        
        try {
          await this.syncOperation(op);
          this.queue.shift();
          await this.removePersistedOperation(op.id);
        } catch (error) {
          if (++op.retries >= op.maxRetries) {
            await this.moveToConflicts(op);
            this.queue.shift();
          } else {
            // Exponential backoff
            await this.delay(Math.pow(2, op.retries) * 1000);
          }
        }
      }

      this.processing = false;
    }
  }
  ```

### Conflict Resolution
- **Three-Way Merge**
  ```javascript
  class ConflictResolver {
    async resolve(local, remote, base) {
      const conflicts = [];
      const merged = { ...base };

      // Compare each field
      for (const key in local) {
        if (local[key] !== base[key] && 
            remote[key] !== base[key] && 
            local[key] !== remote[key]) {
          // Three-way conflict
          conflicts.push({
            field: key,
            local: local[key],
            remote: remote[key],
            base: base[key]
          });
        } else if (local[key] !== base[key]) {
          // Local change only
          merged[key] = local[key];
        } else if (remote[key] !== base[key]) {
          // Remote change only
          merged[key] = remote[key];
        }
      }

      if (conflicts.length > 0) {
        return this.handleConflicts(conflicts, merged);
      }

      return merged;
    }

    async handleConflicts(conflicts, merged) {
      // Automatic resolution strategies
      for (const conflict of conflicts) {
        if (conflict.field === 'distance' || 
            conflict.field === 'duration') {
          // Take the larger value for cumulative fields
          merged[conflict.field] = Math.max(
            conflict.local, 
            conflict.remote
          );
        } else if (conflict.field.endsWith('_at')) {
          // Last write wins for timestamps
          merged[conflict.field] = Math.max(
            conflict.local, 
            conflict.remote
          );
        } else {
          // Manual resolution required
          await this.requestUserResolution(conflict);
        }
      }

      return merged;
    }
  }
  ```

## Performance Optimization

### Message Batching
```javascript
class MessageBatcher {
  constructor(options = {}) {
    this.batchSize = options.batchSize || 100;
    this.flushInterval = options.flushInterval || 100;
    this.batches = new Map();
  }

  add(type, message) {
    if (!this.batches.has(type)) {
      this.batches.set(type, []);
      this.scheduleFlush(type);
    }

    this.batches.get(type).push(message);

    if (this.batches.get(type).length >= this.batchSize) {
      this.flush(type);
    }
  }

  scheduleFlush(type) {
    setTimeout(() => this.flush(type), this.flushInterval);
  }

  flush(type) {
    const batch = this.batches.get(type);
    if (!batch || batch.length === 0) return;

    this.send({
      type: `${type}_batch`,
      messages: batch,
      count: batch.length,
      timestamp: Date.now()
    });

    this.batches.delete(type);
  }
}
```

### Connection Pooling
```javascript
class ConnectionPool {
  constructor(maxConnections = 5) {
    this.connections = [];
    this.maxConnections = maxConnections;
    this.activeRequests = new Map();
  }

  async getConnection() {
    // Find least loaded connection
    let connection = this.connections
      .sort((a, b) => a.load - b.load)[0];

    if (!connection || 
        (connection.load > 10 && 
         this.connections.length < this.maxConnections)) {
      connection = await this.createConnection();
    }

    connection.load++;
    return connection;
  }

  async releaseConnection(connection) {
    connection.load--;
    
    // Close idle connections
    if (connection.load === 0 && this.connections.length > 1) {
      this.closeConnection(connection);
    }
  }
}
```

## Monitoring & Debugging

### Sync Health Metrics
```javascript
class SyncMonitor {
  constructor() {
    this.metrics = {
      messagesPerSecond: 0,
      activeConnections: 0,
      syncLatency: [],
      conflicts: 0,
      errors: 0
    };
  }

  trackSync(startTime, success) {
    const latency = Date.now() - startTime;
    this.metrics.syncLatency.push(latency);
    
    if (!success) {
      this.metrics.errors++;
    }

    this.calculateMetrics();
  }

  calculateMetrics() {
    // P50, P95, P99 latencies
    const sorted = [...this.metrics.syncLatency].sort((a, b) => a - b);
    this.metrics.p50 = sorted[Math.floor(sorted.length * 0.5)];
    this.metrics.p95 = sorted[Math.floor(sorted.length * 0.95)];
    this.metrics.p99 = sorted[Math.floor(sorted.length * 0.99)];
  }

  getHealthStatus() {
    return {
      healthy: this.metrics.errors < 10 &&
               this.metrics.p95 < 1000,
      metrics: this.metrics
    };
  }
}
```