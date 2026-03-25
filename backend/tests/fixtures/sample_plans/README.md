# Sample Planning Data Files

This directory contains sample CSV files that mimic user-generated planning spreadsheets for Seatrium shipyard and port logistics.

## Files

### 1. shipyard_construction_plan.csv
**Purpose**: Shipyard vessel construction project  
**Tasks**: 20 tasks (T001-T020)  
**Duration**: ~2 months (Mar 1 - May 1, 2026)  
**Complexity**: Medium (dependencies, multi-resource allocation)

**Use Case**: Testing full shipyard construction workflow with:
- Task dependencies (T001;T002 → T003)
- Multi-resource assignments (Crane A + Crew B)
- Priority levels (High/Medium/Low)
- Cost constraints

### 2. resource_availability.csv
**Purpose**: Resource catalog with availability and skills  
**Resources**: 19 resources (equipment + personnel)  
**Skills**: Welding, Electrical, HVAC, etc.

**Use Case**: Testing resource allocation, capacity constraints, and skill matching

### 3. constraints.csv
**Purpose**: Explicit constraints for shipyard project  
**Constraints**: 10 constraints (deadlines, capacity, cost, multi-shift, skill matching)

**Use Case**: Testing constraint validation, relaxation suggestions, and feasibility checks

### 4. port_operations_human_plan.csv
**Purpose**: Port logistics operations (human-generated baseline)  
**Tasks**: 10 tasks (container handling, customs, loading)  
**Duration**: 4 weeks (Feb 1 - Feb 28, 2026)

**Use Case**: Testing plan comparison (AI plan vs human plan)

## Data Format Guidelines

### Required Columns (Detected via Pattern Matching)
- **Task ID**: Unique identifier (e.g., T001, TASK-001)
- **Task Name**: Human-readable description
- **Duration**: Days or hours
- **Start Date**: ISO format (YYYY-MM-DD) or common formats (MM/DD/YYYY)
- **End Date**: ISO format (YYYY-MM-DD) or common formats
- **Resource**: Assigned resource(s), multi-resource separated by "+"
- **Dependencies**: Task IDs separated by ";" (e.g., T001;T002)
- **Cost**: Numeric value (optional)
- **Priority**: High/Medium/Low (optional)

### Resource File Format
- **Resource ID**
- **Resource Name**
- **Type**: Equipment, Personnel, Facility
- **Capacity**: Numeric (max concurrent assignments)
- **Availability Start/End**: Date range
- **Hourly Cost**: Numeric (optional)
- **Skills**: Comma-separated skills (optional)

### Constraint File Format
- **Constraint ID**
- **Constraint Type**: Deadline, Resource Capacity, Cost Limit, Facility Capacity, Multi-Shift, Skill Matching
- **Scope**: Task ID(s) or "All"
- **Description**: Human-readable explanation
- **Priority**: Critical/High/Medium/Low
- **Value**: Constraint-specific value (date, number, requirement)

## Usage

These files are used in:
- **Unit tests**: Testing parser logic
- **Integration tests**: End-to-end workflow validation
- **Local demo**: Manual testing and UI development
- **AI agent testing**: Prompt engineering and plan generation

## Extending

To add new test scenarios:
1. Copy an existing CSV file
2. Modify tasks, resources, or constraints
3. Update this README with scenario description
4. Reference the file in test fixtures
