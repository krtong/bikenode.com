# Agent-to-Agent Messaging Implementation Plan

## Architecture Overview

### Hybrid Messaging System
We'll build on Bikenode's existing infrastructure:
- **PostgreSQL**: Persistent message storage with JSONB flexibility
- **Redis**: High-performance message queuing and caching
- **Go API Server**: RESTful messaging endpoints
- **Python Discord Bot**: Extended webhook system for real-time delivery
- **HTTP/WebSocket**: Transport layer with fallback options

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

#### 1.1 Database Schema Extension
```sql
-- Create agents registry table
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL, -- 'claude', 'discord_bot', 'scraper', 'api_server'
    endpoint TEXT, -- HTTP endpoint for delivery
    capabilities JSONB NOT NULL DEFAULT '[]',
    status TEXT DEFAULT 'active', -- 'active', 'inactive', 'maintenance'
    heartbeat_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Agent-to-agent messages
CREATE TABLE agent_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_agent_id UUID REFERENCES agents(id),
    to_agent_id UUID REFERENCES agents(id),
    conversation_id UUID, -- Group related messages
    message_type TEXT NOT NULL, -- 'task', 'response', 'status', 'error', 'heartbeat'
    priority INTEGER DEFAULT 5, -- 1 (highest) to 10 (lowest)
    content JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    status TEXT DEFAULT 'pending', -- 'pending', 'delivered', 'processed', 'failed', 'expired'
    retry_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    delivered_at TIMESTAMP WITH TIME ZONE,
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Message delivery tracking
CREATE TABLE message_delivery_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES agent_messages(id),
    attempt INTEGER NOT NULL,
    status TEXT NOT NULL, -- 'success', 'failed', 'timeout'
    response_code INTEGER,
    response_body TEXT,
    attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_agent_messages_status ON agent_messages(status);
CREATE INDEX idx_agent_messages_to_agent ON agent_messages(to_agent_id, status);
CREATE INDEX idx_agent_messages_priority ON agent_messages(priority, created_at);
CREATE INDEX idx_agent_messages_conversation ON agent_messages(conversation_id);
```

#### 1.2 Go API Endpoints
```go
// Add to existing Go API server
package main

import (
    "encoding/json"
    "net/http"
    "github.com/gorilla/mux"
    "github.com/google/uuid"
)

type Agent struct {
    ID           uuid.UUID       `json:"id" db:"id"`
    Name         string          `json:"name" db:"name"`
    Type         string          `json:"type" db:"type"`
    Endpoint     *string         `json:"endpoint" db:"endpoint"`
    Capabilities json.RawMessage `json:"capabilities" db:"capabilities"`
    Status       string          `json:"status" db:"status"`
    HeartbeatAt  *time.Time      `json:"heartbeat_at" db:"heartbeat_at"`
    CreatedAt    time.Time       `json:"created_at" db:"created_at"`
    UpdatedAt    time.Time       `json:"updated_at" db:"updated_at"`
}

type AgentMessage struct {
    ID             uuid.UUID       `json:"id" db:"id"`
    FromAgentID    *uuid.UUID      `json:"from_agent_id" db:"from_agent_id"`
    ToAgentID      uuid.UUID       `json:"to_agent_id" db:"to_agent_id"`
    ConversationID *uuid.UUID      `json:"conversation_id" db:"conversation_id"`
    MessageType    string          `json:"message_type" db:"message_type"`
    Priority       int             `json:"priority" db:"priority"`
    Content        json.RawMessage `json:"content" db:"content"`
    Metadata       json.RawMessage `json:"metadata" db:"metadata"`
    Status         string          `json:"status" db:"status"`
    ExpiresAt      *time.Time      `json:"expires_at" db:"expires_at"`
    CreatedAt      time.Time       `json:"created_at" db:"created_at"`
}

// API Endpoints
func (app *App) setupAgentMessagingRoutes() {
    app.Router.HandleFunc("/api/agents", app.registerAgent).Methods("POST")
    app.Router.HandleFunc("/api/agents", app.listAgents).Methods("GET")
    app.Router.HandleFunc("/api/agents/{id}/heartbeat", app.agentHeartbeat).Methods("POST")
    
    app.Router.HandleFunc("/api/messages", app.sendMessage).Methods("POST")
    app.Router.HandleFunc("/api/messages", app.getMessages).Methods("GET")
    app.Router.HandleFunc("/api/messages/{id}", app.getMessage).Methods("GET")
    app.Router.HandleFunc("/api/messages/{id}/status", app.updateMessageStatus).Methods("PUT")
}
```

#### 1.3 Redis Message Queue
```go
// Redis-based message queue implementation
package messaging

import (
    "context"
    "encoding/json"
    "github.com/go-redis/redis/v8"
    "time"
)

type MessageQueue struct {
    redis *redis.Client
}

func NewMessageQueue(redisClient *redis.Client) *MessageQueue {
    return &MessageQueue{redis: redisClient}
}

func (mq *MessageQueue) EnqueueMessage(agentID uuid.UUID, message AgentMessage) error {
    messageJSON, err := json.Marshal(message)
    if err != nil {
        return err
    }
    
    queueKey := fmt.Sprintf("agent_queue:%s", agentID.String())
    return mq.redis.LPush(context.Background(), queueKey, messageJSON).Err()
}

func (mq *MessageQueue) DequeueMessage(agentID uuid.UUID, timeout time.Duration) (*AgentMessage, error) {
    queueKey := fmt.Sprintf("agent_queue:%s", agentID.String())
    result := mq.redis.BRPop(context.Background(), timeout, queueKey)
    
    if result.Err() == redis.Nil {
        return nil, nil // No message available
    }
    if result.Err() != nil {
        return nil, result.Err()
    }
    
    var message AgentMessage
    err := json.Unmarshal([]byte(result.Val()[1]), &message)
    return &message, err
}
```

### Phase 2: Core Messaging (Week 2-3)

#### 2.1 Message Formats
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "from_agent_id": "110e8400-e29b-41d4-a716-446655440001",
  "to_agent_id": "220e8400-e29b-41d4-a716-446655440002",
  "conversation_id": "330e8400-e29b-41d4-a716-446655440003",
  "message_type": "task",
  "priority": 3,
  "content": {
    "task_type": "scrape_motorcycle_data",
    "parameters": {
      "url": "https://example.com/bikes",
      "filters": ["honda", "yamaha"],
      "max_pages": 10
    },
    "expected_output": "json_data",
    "deadline": "2024-01-15T10:00:00Z"
  },
  "metadata": {
    "retry_policy": "exponential_backoff",
    "max_retries": 3,
    "timeout": 300
  },
  "status": "pending",
  "expires_at": "2024-01-15T12:00:00Z"
}
```

#### 2.2 Python Agent Client
```python
# Add to Discord bot or create separate agent client
import aiohttp
import asyncio
import json
from typing import Dict, Any, Optional
from datetime import datetime, timedelta

class AgentMessagingClient:
    def __init__(self, agent_id: str, api_base_url: str, api_key: str):
        self.agent_id = agent_id
        self.api_base_url = api_base_url
        self.api_key = api_key
        self.session = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            headers={"Authorization": f"Bearer {self.api_key}"}
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def send_message(
        self, 
        to_agent_id: str, 
        message_type: str, 
        content: Dict[str, Any],
        priority: int = 5,
        expires_in: Optional[timedelta] = None
    ) -> str:
        """Send a message to another agent"""
        message_data = {
            "to_agent_id": to_agent_id,
            "message_type": message_type,
            "content": content,
            "priority": priority
        }
        
        if expires_in:
            expires_at = datetime.utcnow() + expires_in
            message_data["expires_at"] = expires_at.isoformat()
        
        async with self.session.post(
            f"{self.api_base_url}/api/messages",
            json=message_data
        ) as response:
            result = await response.json()
            return result["id"]
    
    async def get_messages(self, status: str = "pending") -> List[Dict[str, Any]]:
        """Get messages for this agent"""
        async with self.session.get(
            f"{self.api_base_url}/api/messages",
            params={"to_agent_id": self.agent_id, "status": status}
        ) as response:
            return await response.json()
    
    async def mark_processed(self, message_id: str, result: Optional[Dict[str, Any]] = None):
        """Mark a message as processed"""
        status_data = {
            "status": "processed",
            "result": result
        }
        
        async with self.session.put(
            f"{self.api_base_url}/api/messages/{message_id}/status",
            json=status_data
        ) as response:
            return response.status == 200

# Usage in Discord bot
class DiscordAgent:
    def __init__(self):
        self.messaging_client = AgentMessagingClient(
            agent_id="discord_bot_001",
            api_base_url="http://localhost:8080",
            api_key=os.getenv("AGENT_API_KEY")
        )
    
    async def process_claude_request(self, user_message: str):
        async with self.messaging_client as client:
            # Send task to Claude agent
            message_id = await client.send_message(
                to_agent_id="claude_agent_001",
                message_type="task",
                content={
                    "task_type": "analyze_user_request",
                    "user_message": user_message,
                    "context": {"platform": "discord"}
                },
                priority=3,
                expires_in=timedelta(minutes=5)
            )
            
            # Poll for response (in real implementation, use webhooks)
            return await self.wait_for_response(message_id)
```

### Phase 3: Advanced Features (Week 3-4)

#### 3.1 Message Routing & Orchestration
```go
// Message router with capability matching
type MessageRouter struct {
    db    *sql.DB
    redis *redis.Client
}

func (mr *MessageRouter) RouteMessage(message *AgentMessage) error {
    // Find available agents with required capabilities
    agents, err := mr.findCapableAgents(message.Content)
    if err != nil {
        return err
    }
    
    // Load balance across available agents
    selectedAgent := mr.selectAgent(agents, message.Priority)
    
    // Update message with selected agent
    message.ToAgentID = selectedAgent.ID
    
    // Enqueue message
    return mr.enqueueMessage(message)
}

func (mr *MessageRouter) findCapableAgents(taskContent json.RawMessage) ([]Agent, error) {
    // Parse task requirements
    var task struct {
        TaskType     string   `json:"task_type"`
        Requirements []string `json:"requirements"`
    }
    json.Unmarshal(taskContent, &task)
    
    // Query agents with matching capabilities
    query := `
        SELECT * FROM agents 
        WHERE status = 'active' 
        AND capabilities @> $1
        AND heartbeat_at > NOW() - INTERVAL '5 minutes'
    `
    
    capabilitiesJSON, _ := json.Marshal(task.Requirements)
    rows, err := mr.db.Query(query, capabilitiesJSON)
    // ... handle results
}
```

#### 3.2 Delivery & Retry Logic
```go
type MessageDelivery struct {
    httpClient *http.Client
    db         *sql.DB
}

func (md *MessageDelivery) DeliverMessage(message *AgentMessage) error {
    agent, err := md.getAgent(message.ToAgentID)
    if err != nil {
        return err
    }
    
    if agent.Endpoint == nil {
        // Agent uses polling, message already in queue
        return md.markDelivered(message.ID)
    }
    
    // HTTP delivery with retry logic
    return md.deliverViaHTTP(message, *agent.Endpoint)
}

func (md *MessageDelivery) deliverViaHTTP(message *AgentMessage, endpoint string) error {
    payload, _ := json.Marshal(message)
    
    maxRetries := 3
    for attempt := 1; attempt <= maxRetries; attempt++ {
        resp, err := md.httpClient.Post(endpoint, "application/json", bytes.NewBuffer(payload))
        
        // Log delivery attempt
        md.logDeliveryAttempt(message.ID, attempt, resp, err)
        
        if err == nil && resp.StatusCode < 300 {
            return md.markDelivered(message.ID)
        }
        
        // Exponential backoff
        if attempt < maxRetries {
            time.Sleep(time.Duration(attempt*attempt) * time.Second)
        }
    }
    
    return md.markFailed(message.ID)
}
```

## Integration with Existing Bikenode Systems

### 1. Discord Bot Integration
```python
# Extend existing Discord bot
class BikenodeBot(commands.Bot):
    def __init__(self):
        super().__init__(command_prefix='!')
        self.agent_client = AgentMessagingClient(
            agent_id="discord_bot",
            api_base_url=os.getenv("API_BASE_URL"),
            api_key=os.getenv("AGENT_API_KEY")
        )
    
    @commands.command(name='ask_claude')
    async def ask_claude(self, ctx, *, question):
        """Ask Claude agent a question"""
        async with self.agent_client as client:
            message_id = await client.send_message(
                to_agent_id="claude_agent",
                message_type="question",
                content={"question": question, "user_id": str(ctx.author.id)},
                priority=3
            )
            
            # Send immediate response
            await ctx.send(f"Question sent to Claude. Message ID: {message_id[:8]}...")
```

### 2. Scraper Integration
```python
# Integrate with existing scrapers
class ScraperAgent:
    def __init__(self, scraper_type: str):
        self.scraper_type = scraper_type
        self.agent_client = AgentMessagingClient(
            agent_id=f"scraper_{scraper_type}",
            api_base_url=os.getenv("API_BASE_URL"),
            api_key=os.getenv("AGENT_API_KEY")
        )
    
    async def handle_scraping_task(self, message: Dict[str, Any]):
        """Handle scraping task from message queue"""
        task_content = message["content"]
        
        try:
            # Perform scraping
            results = await self.scrape_data(task_content)
            
            # Send results back
            await self.agent_client.send_message(
                to_agent_id=message["from_agent_id"],
                message_type="scraping_results",
                content={"results": results, "task_id": message["id"]}
            )
            
            # Mark message as processed
            await self.agent_client.mark_processed(message["id"], {"status": "completed"})
            
        except Exception as e:
            # Send error back
            await self.agent_client.send_message(
                to_agent_id=message["from_agent_id"],
                message_type="error",
                content={"error": str(e), "task_id": message["id"]}
            )
```

## Deployment Strategy

### 1. Database Migration
```bash
# Add to existing migration system
psql -d bikenode -f migrations/add_agent_messaging.sql
```

### 2. Environment Configuration
```bash
# Add to .env
AGENT_API_KEY=your_secure_api_key_here
REDIS_URL=redis://localhost:6379
MESSAGE_QUEUE_WORKERS=3
MESSAGE_RETENTION_DAYS=30
```

### 3. Service Updates
```dockerfile
# Update existing Docker services
version: '3.8'
services:
  api:
    # existing configuration
    environment:
      - ENABLE_AGENT_MESSAGING=true
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
  
  message-processor:
    build: .
    command: ./message-processor
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=redis://redis:6379
```

## Testing Strategy

### 1. Unit Tests
```go
func TestMessageRouting(t *testing.T) {
    // Test message routing logic
}

func TestRetryLogic(t *testing.T) {
    // Test exponential backoff and retry
}
```

### 2. Integration Tests
```python
async def test_agent_communication():
    # Test end-to-end agent messaging
    async with AgentMessagingClient(...) as client1, \
               AgentMessagingClient(...) as client2:
        
        # Send message
        msg_id = await client1.send_message(...)
        
        # Receive and process
        messages = await client2.get_messages()
        assert len(messages) == 1
```

## Monitoring & Observability

### 1. Metrics
- Message throughput (messages/second)
- Delivery success rate
- Average delivery time
- Queue depth by agent
- Failed delivery reasons

### 2. Alerting
- High queue depth
- Delivery failures above threshold
- Agent heartbeat failures
- Database connection issues

This implementation leverages Bikenode's existing infrastructure while providing a robust, scalable messaging system for agent collaboration.