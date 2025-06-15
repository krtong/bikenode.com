# What Does Facebook's Database Look Like?

## Overview

Facebook (Meta) operates one of the largest and most complex database infrastructures in the world, serving over 3 billion monthly active users. Their database architecture has evolved significantly from a simple LAMP stack to a sophisticated, globally distributed system.

## Key Statistics (as of 2024)
- **3+ billion** monthly active users
- **400+ billion** photos stored
- **1+ billion** stories shared daily
- **100+ petabytes** of data
- **Millions** of queries per second
- **5 major** data center regions globally

## Core Database Technologies

### 1. MySQL/RocksDB
Facebook still uses MySQL as their primary database, but with significant modifications:
- **MyRocks**: MySQL storage engine based on RocksDB
- Provides 50% better storage efficiency than InnoDB
- Optimized for flash storage
- Handles user profiles, posts, and relational data

### 2. TAO (The Associations and Objects)
- Facebook's distributed data store for the social graph
- Provides a graph abstraction over MySQL
- Handles billions of reads and millions of writes per second
- Caches and serves the social graph efficiently

### 3. Memcached
- Distributed memory caching system
- Thousands of servers with terabytes of RAM
- Reduces database load by caching frequently accessed data
- Custom modifications for Facebook's scale

### 4. Presto
- Distributed SQL query engine
- Queries data across multiple sources
- Used for analytics and ad-hoc queries
- Can query petabytes of data

## Architecture Layers

### Frontend Tier
- Web servers handle HTTP requests
- Load balancers distribute traffic
- Edge caching for static content

### Caching Tier
- Memcached clusters
- TAO caching layer
- CDN for media content

### Data Storage Tier
- MySQL/RocksDB for structured data
- Haystack for photo storage
- F4 for warm blob storage
- Data warehouse for analytics

## Key Design Principles

### 1. Sharding
- Data is horizontally partitioned across thousands of database servers
- User data is sharded by user ID
- Ensures no single database becomes a bottleneck

### 2. Replication
- Master-slave replication within regions
- Cross-region replication for disaster recovery
- Eventually consistent model for global data

### 3. Caching Everything
- Multiple layers of caching
- Cache invalidation strategies
- Read-through and write-through caches

### 4. Denormalization
- Trade storage for performance
- Duplicate data to avoid joins
- Optimize for read-heavy workloads

## Evolution Timeline

### 2004-2006: The Beginning
- Single MySQL server
- Basic LAMP stack
- Vertical scaling approach

### 2007-2009: Rapid Growth
- Introduction of Memcached
- MySQL replication
- Initial sharding implementation

### 2010-2012: TAO Development
- Built TAO for social graph
- Massive caching infrastructure
- Multiple data centers

### 2013-2015: Efficiency Focus
- Development of MyRocks
- F4 cold storage system
- Presto for analytics

### 2016-Present: Global Scale
- Edge computing
- Machine learning integration
- Real-time data processing

## Challenges and Solutions

### Challenge 1: Consistency at Scale
**Solution**: Eventual consistency model with careful ordering guarantees

### Challenge 2: Query Complexity
**Solution**: TAO provides efficient graph queries without complex joins

### Challenge 3: Storage Costs
**Solution**: Tiered storage with hot/warm/cold data separation

### Challenge 4: Global Latency
**Solution**: Regional data centers with edge caching

## Lessons for Modern Applications

1. **Start Simple**: Facebook began with MySQL and still uses it
2. **Cache Aggressively**: Reduce database load wherever possible
3. **Shard Early**: Design for horizontal scaling from the start
4. **Monitor Everything**: Comprehensive monitoring is crucial
5. **Optimize for Your Workload**: Facebook optimized for reads over writes

## Further Reading

- [TAO Architecture](./tao-architecture.md)
- [MySQL at Facebook Scale](./mysql-at-scale.md)
- [Caching Strategy](./caching-strategy.md)
- [Data Models](./data-models.md)
- [Replication and Consistency](./replication-consistency.md)

## References

- Facebook Engineering Blog
- "TAO: Facebook's Distributed Data Store for the Social Graph" (USENIX ATC '13)
- "MyRocks: LSM-Tree Database Storage Engine" (VLDB 2017)
- Various Facebook Engineering talks and papers