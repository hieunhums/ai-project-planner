# Data Model: AI-Augmented Planning Assistant

**Feature**: 001-ai-planning-assistant  
**Version**: 1.0  
**Last Updated**: February 16, 2026

---

## Overview

The data model supports shipyard and port logistics planning with AI-assisted optimization. All entities track **lineage** (AI-generated, human-created, or hybrid) to maintain transparency in decision-making.

---

## Core Entities

### 1. Plan

**Purpose**: Represents a complete planning solution (either human-created or AI-generated)

**Attributes**:
- `id` (int, PK): Unique plan identifier
- `name` (string): Plan name
- `description` (string, optional): Plan description
- `status` (enum): `uploaded`, `parsing`, `generating`, `completed`, `failed`
- `lineage` (enum): `ai_generated`, `human_created`, `hybrid`
- `total_duration_days` (float, optional): Total plan duration
- `capacity_utilization` (float, optional): Average capacity utilization (%)
- `total_cost` (float, optional): Total plan cost
- `created_at` (datetime): Creation timestamp
- `updated_at` (datetime): Last update timestamp
- `source_file_path` (string, optional): Path to uploaded file
- `plan_data_json` (JSON, optional): Raw plan data

**Relationships**:
- One plan → many tasks
- One plan → many resources
- One plan → many assumptions
- One plan → many recommendations

---

### 2. Task

**Purpose**: Represents a single planning unit (e.g., "Hull Assembly", "Engine Installation")

**Attributes**:
- `id` (int, PK): Unique task identifier
- `plan_id` (int, FK): Reference to parent plan
- `task_id` (string): Business task identifier (e.g., "T001")
- `name` (string): Task name
- `duration_days` (float): Task duration in days
- `start_date` (datetime, optional): Planned start date
- `end_date` (datetime, optional): Planned end date
- `resource_requirements` (JSON, optional): Required resources
- `dependencies` (JSON): List of predecessor task IDs
- `constraints` (JSON, optional): Task-specific constraints
- `priority` (string, optional): Priority level (High/Medium/Low)
- `cost` (float, optional): Task cost
- `lineage` (enum): `ai_generated`, `human_created`, `hybrid`
- `created_at` (datetime): Creation timestamp

**Example**:
```json
{
  "task_id": "T001",
  "name": "Hull Assembly - Section A",
  "duration_days": 14,
  "start_date": "2026-03-01",
  "end_date": "2026-03-15",
  "resource_requirements": {"crane": "Crane A", "crew": 5},
  "dependencies": [],
  "priority": "High",
  "cost": 50000,
  "lineage": "human_created"
}
```

---

### 3. Resource

**Purpose**: Represents an asset (equipment, personnel, or facility)

**Attributes**:
- `id` (int, PK): Unique resource identifier
- `plan_id` (int, FK): Reference to parent plan
- `resource_id` (string): Business resource identifier (e.g., "R001")
- `name` (string): Resource name
- `type` (string): `Equipment`, `Personnel`, `Facility`
- `capacity` (int, optional): Maximum concurrent assignments
- `availability_start` (datetime, optional): Availability start
- `availability_end` (datetime, optional): Availability end
- `hourly_cost` (float, optional): Cost per hour
- `skills` (JSON, optional): List of skills/certifications
- `allocation_status` (JSON, optional): Current allocation state
- `created_at` (datetime): Creation timestamp

**Example**:
```json
{
  "resource_id": "R001",
  "name": "Crane A",
  "type": "Equipment",
  "capacity": 1,
  "availability_start": "2026-03-01",
  "availability_end": "2026-06-30",
  "hourly_cost": 150,
  "skills": ["Heavy Lifting"],
  "allocation_status": {"assigned_tasks": ["T001", "T005"]}
}
```

---

### 4. Assumption

**Purpose**: Explicit assumptions made during AI plan generation (for transparency)

**Attributes**:
- `id` (int, PK): Unique assumption identifier
- `plan_id` (int, FK): Reference to parent plan
- `assumption_type` (string): Type of assumption (e.g., "priority_weighting", "risk_tolerance")
- `description` (string): Human-readable description
- `value` (string, optional): Assumption value
- `created_at` (datetime): Creation timestamp

**Example**:
```json
{
  "assumption_type": "priority_weighting",
  "description": "High-priority tasks scheduled first to minimize critical path",
  "value": "priority_weight=2.0"
}
```

---

### 5. Recommendation

**Purpose**: AI suggestions for plan improvement (human-in-the-loop control)

**Attributes**:
- `id` (int, PK): Unique recommendation identifier
- `plan_id` (int, FK): Reference to parent plan
- `recommendation_type` (string): Type of recommendation (e.g., "task_reschedule", "resource_reallocation")
- `affected_entities` (JSON): Task/resource IDs affected
- `rationale` (string): Explanation of recommendation
- `impact_metrics` (JSON, optional): Expected impact (e.g., schedule reduction, cost savings)
- `status` (string): `pending`, `accepted`, `rejected`
- `created_at` (datetime): Creation timestamp
- `decided_at` (datetime, optional): Decision timestamp

**Example**:
```json
{
  "recommendation_type": "task_reschedule",
  "affected_entities": {"task_id": "T003"},
  "rationale": "Moving Task T003 to Week 4 reduces resource contention with Task T007",
  "impact_metrics": {"schedule_reduction_days": 2, "capacity_utilization_increase": 5},
  "status": "pending"
}
```

---

## Entity Relationships

```
Plan (1) ──────┬───────> Task (N)
               ├───────> Resource (N)
               ├───────> Assumption (N)
               └───────> Recommendation (N)
```

---

## Lineage Tracking

All entities support **lineage tracking** to identify origin:

| Lineage | Description | Use Case |
|---------|-------------|----------|
| `ai_generated` | Created by AI reasoning model | AI-optimized tasks, schedules, recommendations |
| `human_created` | Created by human planner | Original uploaded plan, manual adjustments |
| `hybrid` | Mix of AI and human decisions | User accepted some AI recommendations, rejected others |

**Example Query**: "Show me all AI-generated tasks that the planner accepted"

```sql
SELECT * FROM tasks
WHERE lineage = 'ai_generated'
AND id IN (
  SELECT affected_entities->>'task_id'
  FROM recommendations
  WHERE status = 'accepted'
);
```

---

## Database Schema (SQLite)

### Tables

```sql
CREATE TABLE plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL,
    lineage TEXT NOT NULL,
    total_duration_days REAL,
    capacity_utilization REAL,
    total_cost REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    source_file_path TEXT,
    plan_data_json TEXT
);

CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id INTEGER NOT NULL,
    task_id TEXT NOT NULL,
    name TEXT NOT NULL,
    duration_days REAL NOT NULL,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    resource_requirements TEXT,
    dependencies TEXT,
    constraints TEXT,
    priority TEXT,
    cost REAL,
    lineage TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
);

CREATE TABLE resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id INTEGER NOT NULL,
    resource_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    capacity INTEGER,
    availability_start TIMESTAMP,
    availability_end TIMESTAMP,
    hourly_cost REAL,
    skills TEXT,
    allocation_status TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
);

CREATE TABLE assumptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id INTEGER NOT NULL,
    assumption_type TEXT NOT NULL,
    description TEXT NOT NULL,
    value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
);

CREATE TABLE recommendations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id INTEGER NOT NULL,
    recommendation_type TEXT NOT NULL,
    affected_entities TEXT NOT NULL,
    rationale TEXT NOT NULL,
    impact_metrics TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    decided_at TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
);
```

### Indexes

```sql
CREATE INDEX idx_tasks_plan_id ON tasks(plan_id);
CREATE INDEX idx_resources_plan_id ON resources(plan_id);
CREATE INDEX idx_assumptions_plan_id ON assumptions(plan_id);
CREATE INDEX idx_recommendations_plan_id ON recommendations(plan_id);
CREATE INDEX idx_recommendations_status ON recommendations(status);
```

---

## Data Flow

```
CSV/Excel Upload
    ↓
[Parser] → Extract Tasks, Resources, Constraints
    ↓
[Storage Service] → Save Plan with lineage="human_created"
    ↓
[AI Agent] → Generate optimized plan
    ↓
[Storage Service] → Save Tasks with lineage="ai_generated"
    ↓
[Comparison Service] → Identify differences
    ↓
[Recommendation Service] → Generate improvement suggestions
    ↓
[User Decision] → Accept/Reject recommendations
    ↓
[Final Plan] → Update lineage to "hybrid" where accepted
```

---

## Constraints

- **Scale**: 10-50 tasks per plan (MVP)
- **File Size**: Max 10MB for uploads
- **Storage**: SQLite database < 100MB
- **Retention**: Plans stored indefinitely (local demo; no cleanup policy)

---

## Future Enhancements

- **Plan versioning**: Track iterations of constraint modifications
- **Audit log**: Track all user decisions (accept/reject recommendations)
- **Multi-project support**: Link resources across multiple plans
- **Real-time collaboration**: Multiple users editing same plan (not in MVP)
