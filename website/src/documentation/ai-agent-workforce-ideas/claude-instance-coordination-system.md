# Claude Code Instance Coordination System

## System Overview

This document defines the practical coordination system that enables multiple Claude Code instances to work together effectively on BikeNode development through shared files, standardized protocols, and systematic handoffs.

## Core Coordination Files

### 1. Instance Registry and Status
**File:** `/coordination/instance-registry.json`
```json
{
  "instances": {
    "instance-1": {
      "role": "architecture-backend",
      "status": "active",
      "current_task": "designing-microservices-architecture",
      "last_update": "2024-01-15T10:30:00Z",
      "expertise_areas": ["system-architecture", "api-design", "database-design"],
      "available_for_consultation": true,
      "current_session_id": "arch_session_001"
    },
    "instance-2": {
      "role": "documentation-strategy",
      "status": "active", 
      "current_task": "coordination-system-design",
      "last_update": "2024-01-15T11:15:00Z",
      "expertise_areas": ["documentation", "strategic-planning", "process-design"],
      "available_for_consultation": true,
      "current_session_id": "doc_session_001"
    },
    "instance-3": {
      "role": "frontend-ux",
      "status": "pending",
      "current_task": null,
      "last_update": null,
      "expertise_areas": ["react", "ui-design", "user-experience"],
      "available_for_consultation": false,
      "current_session_id": null
    },
    "instance-4": {
      "role": "ai-ml-specialist",
      "status": "pending",
      "current_task": null,
      "last_update": null,
      "expertise_areas": ["machine-learning", "ai-agents", "data-processing"],
      "available_for_consultation": false,
      "current_session_id": null
    },
    "instance-5": {
      "role": "devops-infrastructure",
      "status": "pending",
      "current_task": null,
      "last_update": null,
      "expertise_areas": ["deployment", "monitoring", "scalability"],
      "available_for_consultation": false,
      "current_session_id": null
    },
    "instance-6": {
      "role": "security-compliance",
      "status": "pending", 
      "current_task": null,
      "last_update": null,
      "expertise_areas": ["security", "privacy", "compliance"],
      "available_for_consultation": false,
      "current_session_id": null
    }
  },
  "coordination_protocol_version": "1.0",
  "last_registry_update": "2024-01-15T11:15:00Z"
}
```

### 2. Task Queue and Assignments
**File:** `/coordination/task-queue.json`
```json
{
  "active_tasks": [
    {
      "task_id": "task_001",
      "title": "Design BikeNode AI Agent Architecture",
      "description": "Create comprehensive architecture for AI agent collaboration system",
      "assigned_to": "instance-2",
      "status": "in_progress",
      "priority": "high",
      "created": "2024-01-15T10:00:00Z",
      "due": "2024-01-15T18:00:00Z",
      "dependencies": [],
      "deliverables": [
        "/documentation/ai-agent-workforce-ideas/",
        "/coordination/agent-collaboration-spec.md"
      ]
    }
  ],
  "pending_tasks": [
    {
      "task_id": "task_002", 
      "title": "Implement Backend API for Agent Coordination",
      "description": "Build REST APIs for agent communication and coordination",
      "assigned_to": null,
      "status": "pending_assignment",
      "priority": "high",
      "created": "2024-01-15T11:15:00Z",
      "due": "2024-01-16T18:00:00Z",
      "dependencies": ["task_001"],
      "required_expertise": ["backend", "api-design"],
      "suggested_assignee": "instance-1"
    },
    {
      "task_id": "task_003",
      "title": "Design Agent UI/UX Interface",
      "description": "Create user interface for interacting with AI agent system",
      "assigned_to": null,
      "status": "pending_assignment", 
      "priority": "medium",
      "created": "2024-01-15T11:15:00Z",
      "due": "2024-01-17T18:00:00Z",
      "dependencies": ["task_001", "task_002"],
      "required_expertise": ["frontend", "ux-design"],
      "suggested_assignee": "instance-3"
    }
  ],
  "completed_tasks": []
}
```

### 3. Cross-Instance Communication Log
**File:** `/coordination/communication-log.json`
```json
{
  "messages": [
    {
      "message_id": "msg_001",
      "from": "instance-2",
      "to": "instance-1",
      "type": "consultation_request",
      "timestamp": "2024-01-15T11:20:00Z",
      "subject": "API Design for Agent Coordination",
      "message": "Need architectural input on REST API design for agent-to-agent communication. Should we use GraphQL federation or traditional REST endpoints?",
      "priority": "medium",
      "requires_response": true,
      "context": {
        "related_task": "task_002",
        "related_files": ["/documentation/ai-agent-workforce-ideas/agent-collaboration-framework.md"]
      },
      "status": "pending_response"
    }
  ],
  "response_queue": [
    {
      "responding_to": "msg_001",
      "from": "instance-1", 
      "status": "pending",
      "expected_response_time": "2024-01-15T12:00:00Z"
    }
  ]
}
```

### 4. Shared Decision Log
**File:** `/coordination/decisions.json`
```json
{
  "decisions": [
    {
      "decision_id": "dec_001",
      "title": "Claude Instance Coordination Protocol",
      "description": "Established file-based coordination system for multi-instance collaboration",
      "decision": "Use shared JSON files in /coordination/ directory for instance coordination",
      "rationale": "Enables asynchronous coordination within Claude Code constraints",
      "decided_by": ["instance-2"],
      "date": "2024-01-15T11:15:00Z",
      "status": "active",
      "affects_instances": ["all"],
      "related_tasks": ["task_001"]
    }
  ],
  "pending_decisions": [
    {
      "decision_id": "dec_002",
      "title": "Agent Communication Protocol",
      "description": "Choose between REST API vs GraphQL for agent coordination",
      "options": [
        {
          "option": "REST API",
          "pros": ["Simple", "Well understood", "Easy to debug"],
          "cons": ["Multiple endpoints", "Overfetching potential"]
        },
        {
          "option": "GraphQL Federation",
          "pros": ["Single endpoint", "Flexible queries", "Type safety"],
          "cons": ["More complex", "Learning curve", "Debugging harder"]
        }
      ],
      "input_needed_from": ["instance-1", "instance-3"],
      "deadline": "2024-01-15T16:00:00Z"
    }
  ]
}
```

## Coordination Protocols

### Protocol 1: Instance Check-In
**When:** Every time an instance starts work
**Action:** Update instance registry with current status

```bash
# Update instance status
echo "Instance 2 checking in at $(date)"

# Read current registry, update my status, write back
# This would be done through file operations in actual implementation
```

### Protocol 2: Task Assignment
**When:** New task needs to be assigned
**Process:**
1. Instance creates task in task-queue.json
2. Identifies required expertise and suggests assignee
3. Target instance checks queue and accepts/declines
4. Assignment confirmed in registry

### Protocol 3: Cross-Instance Consultation
**When:** Need expertise from another instance
**Process:**
1. Add message to communication-log.json
2. Target instance checks log and responds
3. Response added to same log thread
4. Requesting instance acknowledges and closes thread

### Protocol 4: Decision Making
**When:** Architectural or design decisions needed
**Process:**
1. Instance proposes decision with options in decisions.json
2. Required instances provide input
3. Decision maker synthesizes input and makes final call
4. Decision logged with rationale and affected parties

## Practical Implementation for BikeNode

### Instance Startup Checklist
Every Claude Code instance should:
1. Check `/coordination/instance-registry.json` and update their status
2. Review `/coordination/task-queue.json` for assigned tasks
3. Check `/coordination/communication-log.json` for messages
4. Review `/coordination/decisions.json` for recent decisions affecting their work

### File-Based Coordination Example
```python
# Pseudo-code for how an instance would coordinate
import json
from datetime import datetime

class ClaudeInstanceCoordinator:
    def __init__(self, instance_id, role):
        self.instance_id = instance_id
        self.role = role
        self.coordination_dir = "/coordination/"
    
    def check_in(self):
        """Update registry with current status"""
        registry = self.load_json("instance-registry.json")
        registry["instances"][self.instance_id].update({
            "status": "active",
            "last_update": datetime.now().isoformat(),
            "available_for_consultation": True
        })
        self.save_json("instance-registry.json", registry)
    
    def check_messages(self):
        """Check for messages requiring response"""
        comm_log = self.load_json("communication-log.json")
        my_messages = [msg for msg in comm_log["messages"] 
                      if msg["to"] == self.instance_id and msg["status"] == "pending_response"]
        return my_messages
    
    def request_consultation(self, target_instance, subject, message):
        """Send consultation request to another instance"""
        comm_log = self.load_json("communication-log.json")
        new_message = {
            "message_id": f"msg_{len(comm_log['messages']) + 1:03d}",
            "from": self.instance_id,
            "to": target_instance, 
            "type": "consultation_request",
            "timestamp": datetime.now().isoformat(),
            "subject": subject,
            "message": message,
            "status": "pending_response"
        }
        comm_log["messages"].append(new_message)
        self.save_json("communication-log.json", comm_log)
    
    def respond_to_message(self, message_id, response):
        """Respond to a consultation request"""
        comm_log = self.load_json("communication-log.json")
        # Add response logic here
        # Update message status to "responded"
        # Add response to thread
        self.save_json("communication-log.json", comm_log)
```

## Coordination Workflow Examples

### Example 1: New Feature Development
```
1. Instance-2 (me) identifies need for AI agent system
2. Creates task_001 in task-queue.json for architecture design
3. Assigns to self, updates registry status
4. Creates comprehensive documentation and design
5. Creates task_002 for backend implementation
6. Sends consultation request to Instance-1 about API design
7. Instance-1 responds with architectural recommendations
8. Instance-2 updates design based on input
9. Creates task_003 for frontend implementation
10. Process continues with other instances
```

### Example 2: Cross-Instance Problem Solving
```
Problem: How to handle real-time agent coordination?

1. Instance-2 creates decision dec_002 in decisions.json
2. Lists options and requests input from Instance-1 (backend) and Instance-3 (frontend)
3. Instance-1 analyzes from backend scalability perspective
4. Instance-3 analyzes from user experience perspective  
5. Instance-2 synthesizes input and makes final decision
6. All instances implement according to decision
```

## Quality Assurance

### Coordination Health Checks
- All instances should check in within 24 hours
- Messages should be responded to within 4 hours during active development
- Tasks should have clear deadlines and dependencies
- Decisions should include all affected instances

### Conflict Resolution
- If instances disagree, escalate to human coordinator
- Document disagreements and resolution process
- Learn from conflicts to improve coordination protocols
- Maintain professional, collaborative tone in all communications

This coordination system provides the practical framework for our 6 Claude Code instances to work together effectively on BikeNode development while working within the constraints of file-based communication and human orchestration.