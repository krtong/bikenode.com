# TAO: The Associations and Objects

## What is TAO?

TAO (The Associations and Objects) is Facebook's distributed data store specifically designed to serve the social graph. It provides a graph-aware data abstraction layer on top of MySQL, handling billions of reads and millions of writes per second.

## Why TAO?

### The Problem
- Facebook's social graph is inherently a graph structure
- Traditional SQL databases struggle with graph queries
- Memcached alone couldn't handle complex graph operations
- Need for consistent, efficient graph traversals

### The Solution
TAO provides:
- Efficient graph operations
- Built-in caching
- Consistency guarantees
- Massive scalability

## Data Model

### Objects
Objects represent entities in the social graph:
```
Object {
  id: 64-bit integer
  type: (user, page, photo, comment, etc.)
  data: key-value pairs
}
```

Example:
```
User Object {
  id: 12345
  type: "user"
  data: {
    name: "John Doe"
    email: "john@example.com"
    created_at: "2024-01-01"
  }
}
```

### Associations
Associations represent edges between objects:
```
Association {
  id1: source object ID
  type: association type
  id2: destination object ID
  time: timestamp
  data: key-value pairs
}
```

Example:
```
Friendship Association {
  id1: 12345 (John)
  type: "friend"
  id2: 67890 (Jane)
  time: 1704067200
  data: {
    status: "confirmed"
    visibility: "public"
  }
}
```

## Architecture

### Layers

#### 1. TAO Clients
- Embedded in web servers
- Cache recent queries
- Route requests to appropriate servers

#### 2. TAO Caching Layer
- Distributed cache servers
- Store hot objects and associations
- Handle majority of read requests

#### 3. TAO Database Layer
- MySQL databases with sharded data
- Source of truth for all data
- Handles writes and cache misses

### Sharding Strategy

#### Object Sharding
- Objects are sharded by their ID
- Consistent hashing for distribution
- Each shard replicated for reliability

#### Association Sharding
- Associations stored with their source object
- Enables efficient "outgoing edge" queries
- Inverse associations for bidirectional queries

## Operations

### Basic Operations

#### Read Operations
```
get(object_id) -> Object
assoc_get(id1, type, id2s) -> List<Association>
assoc_count(id1, type) -> Integer
assoc_range(id1, type, offset, limit) -> List<Association>
```

#### Write Operations
```
create(object) -> ID
update(object_id, data) -> Boolean
delete(object_id) -> Boolean
assoc_add(id1, type, id2, data) -> Boolean
assoc_delete(id1, type, id2) -> Boolean
```

### Query Examples

#### Get User's Friends
```
friends = assoc_range(user_id, "friend", 0, 100)
friend_ids = [f.id2 for f in friends]
friend_objects = multiget(friend_ids)
```

#### Get Photos Tagged with User
```
photo_tags = assoc_range(user_id, "tagged_in", 0, 50)
photo_ids = [p.id2 for p in photo_tags]
photos = multiget(photo_ids)
```

## Consistency Model

### Write Consistency
- Writes go through master database
- Synchronous replication within region
- Asynchronous replication across regions

### Read Consistency
- Read-after-write consistency within region
- Eventual consistency across regions
- Cache invalidation propagates quickly

### Cache Invalidation
1. Write occurs at master
2. Master sends invalidation to local caches
3. Invalidation propagates to follower regions
4. Caches refill on next read

## Performance Optimizations

### 1. Aggressive Caching
- Multi-level cache hierarchy
- Client-side caching
- Regional cache tiers
- High cache hit rates (>99%)

### 2. Request Coalescing
- Batch similar requests
- Reduce database load
- Improve response times

### 3. Inverse Associations
- Store bidirectional edges
- Enable efficient reverse queries
- Trade storage for query performance

### 4. Denormalization
- Embed frequently accessed data
- Reduce number of queries
- Optimize for common access patterns

## Scalability Features

### Horizontal Scaling
- Add more cache servers for read scaling
- Add more database shards for write scaling
- Linear scalability with proper sharding

### Geographic Distribution
- Multiple data center regions
- Local caches for low latency
- Cross-region replication

### Load Balancing
- Consistent hashing for shard selection
- Request routing based on load
- Automatic failover

## Monitoring and Operations

### Key Metrics
- Cache hit rate
- Query latency (p50, p99)
- Write throughput
- Replication lag

### Operational Tools
- Automated shard rebalancing
- Cache warming utilities
- Consistency checking tools
- Performance profiling

## Lessons Learned

### 1. Optimize for Common Cases
- Most queries are for recent data
- Friend lists are accessed frequently
- Photos dominate storage

### 2. Cache Everything Possible
- Memory is cheaper than computation
- Cache at multiple levels
- Invalidate aggressively

### 3. Design for Failure
- Assume components will fail
- Build in redundancy
- Graceful degradation

### 4. Keep It Simple
- Simple data model
- Clear consistency guarantees
- Easy to reason about

## Comparison with Other Systems

### vs. Traditional RDBMS
- **TAO**: Optimized for graph operations
- **RDBMS**: Better for complex transactions

### vs. Graph Databases (Neo4j)
- **TAO**: Simpler model, massive scale
- **Neo4j**: Richer query language, smaller scale

### vs. Key-Value Stores
- **TAO**: Graph-aware operations
- **KV Stores**: Simpler, less functionality

## Future Directions

### Potential Improvements
- Stronger consistency options
- More complex graph algorithms
- Better multi-region coordination
- Integration with ML systems

### Industry Impact
- Influenced design of other graph stores
- Open-source alternatives inspired by TAO
- Standard for social graph storage

## References

- "TAO: Facebook's Distributed Data Store for the Social Graph" (USENIX ATC '13)
- Facebook Engineering Blog posts on TAO
- Various conference talks by Facebook engineers