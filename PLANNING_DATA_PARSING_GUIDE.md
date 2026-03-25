# Planning Data Parsing & Schema Inference Guide

**Purpose**: Practical guide for parsing and inferring planning structures from Excel/CSV uploads  
**Target**: Building robust spreadsheet import for shipyard/port logistics planning applications  
**Last Updated**: February 16, 2026

---

## Table of Contents

1. [Python Libraries & Architecture](#python-libraries--architecture)
2. [Schema Inference Strategies](#schema-inference-strategies)
3. [Data Quality Issue Handling](#data-quality-issue-handling)
4. [Mapping to Planning Entities](#mapping-to-planning-entities)
5. [Validation & Error Reporting](#validation--error-reporting)
6. [Sample Code: Shipyard Planning Parser](#sample-code-shipyard-planning-parser)
7. [FastAPI Integration Pattern](#fastapi-integration-pattern)
8. [User Templates & Best Practices](#user-templates--best-practices)

---

## Python Libraries & Architecture

### Library Comparison

| Library | Use Case | Pros | Cons | Recommendation |
|---------|----------|------|------|-----------------|
| **pandas** | Data manipulation & analysis | Powerful transformation, schema detection, flexible, memory-efficient for large files | Learning curve, slower than numpy for raw math, can be memory-heavy with millions of rows | ✅ **PRIMARY** - Use for 90% of planning data |
| **openpyxl** | Excel .xlsx parsing | Native Excel support, cell-level control, formatting preservation | Slow for large files, more verbose, overhead | Use for complex Excel features (formatting, formulas) |
| **xlrd** | Legacy .xls reading | Fast for old Excel files | Limited to read-only, deprecated (use openpyxl instead) | Skip - use openpyxl |
| **csv** (stdlib) | CSV parsing | Built-in, lightweight, fast | No data type inference, requires manual type conversion | Use as fallback, or pair with pandas |
| **pyxlsx** | Fast Excel reading | Fastest for .xlsx files | Less feature-rich than openpyxl | Only if performance critical (millions of rows) |
| **chardet** | Encoding detection | Detects file encoding automatically | External dependency | **REQUIRED** for CSV with unknown encoding |
| **dask** | Large file processing | Handles millions of rows, lazy evaluation | Complex API, slower than pandas for small files | Use only for enterprise-scale (>1M rows) |

### Recommended Architecture

```
┌─────────────────────────────────────────────────────────┐
│  FastAPI Endpoint (file upload)                         │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  FileType Detector                                      │
│  (CSV vs XLSX auto-detection)                           │
└──────────────────┬──────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
┌─────────────────┐  ┌──────────────────┐
│  CSV Parser     │  │  Excel Parser    │
│  (pandas +      │  │  (openpyxl +     │
│   chardet)      │  │   pandas)        │
└────────┬────────┘  └─────────┬────────┘
         │                     │
         └──────────┬──────────┘
                    ▼
        ┌──────────────────────────┐
        │  Schema Inference Engine │
        │  (Column type detection) │
        └──────────┬───────────────┘
                   │
                   ▼
        ┌──────────────────────────┐
        │  Data Quality Validator  │
        │  (Missing values, types) │
        └──────────┬───────────────┘
                   │
                   ▼
        ┌──────────────────────────┐
        │  Entity Mapper           │
        │  (Parse to Task/Resource)│
        └──────────┬───────────────┘
                   │
                   ▼
        ┌──────────────────────────┐
        │  Planning Entity Models  │
        │  (Pydantic models)       │
        └──────────────────────────┘
```

### Dependencies

```
# requirements.txt
pandas>=2.0.0          # Data parsing & transformation
openpyxl>=3.1.0       # Excel .xlsx support
chardet>=5.1.0        # Encoding detection
python-dateutil>=2.8.2 # Date parsing
pydantic>=2.0.0       # Schema validation
fastapi>=0.104.0      # Web framework
python-multipart>=0.0.6 # File uploads
```

---

## Schema Inference Strategies

### 1. Column Type Detection Strategy

**Goal**: Automatically identify what each column represents without manual mapping.

```python
from typing import Dict, List, Set
import pandas as pd
import re
from datetime import datetime

class ColumnTypeDetector:
    """Detect column types in planning spreadsheets."""
    
    def __init__(self, df: pd.DataFrame, sample_rows: int = 100):
        self.df = df
        self.sample_rows = min(sample_rows, len(df))
        self.column_scores = {}
    
    def detect_column_types(self) -> Dict[str, str]:
        """
        Infer column types: 'task_id', 'task_name', 'date', 'duration',
        'resource_name', 'resource_qty', 'constraint', 'dependency', 'priority',
        'cost', 'unknown'
        """
        detected_types = {}
        
        for col in self.df.columns:
            detected_types[col] = self._detect_single_column(col)
        
        return detected_types
    
    def _detect_single_column(self, col: str) -> str:
        """Detect type of a single column."""
        sample = self.df[col].dropna().head(self.sample_rows)
        
        if len(sample) == 0:
            return "unknown"
        
        scores = {
            "task_id": self._score_task_id(col, sample),
            "task_name": self._score_task_name(col, sample),
            "date": self._score_date(col, sample),
            "duration": self._score_duration(col, sample),
            "resource_name": self._score_resource_name(col, sample),
            "resource_qty": self._score_resource_qty(col, sample),
            "dependency": self._score_dependency(col, sample),
            "priority": self._score_priority(col, sample),
            "cost": self._score_cost(col, sample),
        }
        
        # Return highest scoring type, or "unknown" if all low
        best_type = max(scores, key=scores.get)
        best_score = scores[best_type]
        
        return best_type if best_score > 0.5 else "unknown"
    
    def _score_task_id(self, col: str, sample: pd.Series) -> float:
        """Score likelihood of task ID column."""
        score = 0.0
        
        # Check column name
        if any(keyword in col.lower() for keyword in ["task_id", "task id", "id", "t_id"]):
            score += 0.4
        
        # Check values: short alphanumeric, mostly unique
        if sample.dtype == 'object':
            unique_ratio = sample.nunique() / len(sample)
            if unique_ratio > 0.95:  # Near-unique values
                score += 0.3
            
            # Check format: matches "T1", "Task1", "TASK_001" patterns
            pattern_match = sum(1 for v in sample if re.match(r'^(T|TASK|Task)[\d_\w]*$', str(v)))
            if pattern_match / len(sample) > 0.7:
                score += 0.3
        
        return score
    
    def _score_task_name(self, col: str, sample: pd.Series) -> float:
        """Score likelihood of task name column."""
        score = 0.0
        
        # Check column name
        if any(keyword in col.lower() for keyword in ["task", "name", "title", "description"]):
            score += 0.3
        
        # Check values: text, moderate length, somewhat unique
        if sample.dtype == 'object':
            avg_length = sample.str.len().mean()
            if 5 < avg_length < 100:  # Typical task name length
                score += 0.3
            
            unique_ratio = sample.nunique() / len(sample)
            if unique_ratio > 0.7:  # Mostly unique
                score += 0.2
        
        return score
    
    def _score_date(self, col: str, sample: pd.Series) -> float:
        """Score likelihood of date column."""
        score = 0.0
        
        # Check column name
        if any(keyword in col.lower() for keyword in ["date", "start", "end", "due", "when"]):
            score += 0.4
        
        # Check values: can be parsed as dates
        date_match = 0
        for v in sample:
            try:
                pd.to_datetime(str(v), errors='coerce')
                if pd.notna(pd.to_datetime(str(v), errors='coerce')):
                    date_match += 1
            except:
                pass
        
        if len(sample) > 0 and date_match / len(sample) > 0.7:
            score += 0.6
        
        return score
    
    def _score_duration(self, col: str, sample: pd.Series) -> float:
        """Score likelihood of duration column."""
        score = 0.0
        
        # Check column name
        if any(keyword in col.lower() for keyword in ["duration", "days", "hours", "weeks", "length"]):
            score += 0.4
        
        # Check values: numeric, positive integers
        try:
            numeric = pd.to_numeric(sample, errors='coerce')
            if numeric.notna().sum() / len(sample) > 0.8:  # Mostly numeric
                if (numeric.dropna() > 0).all():  # All positive
                    score += 0.5
        except:
            pass
        
        return score
    
    def _score_resource_name(self, col: str, sample: pd.Series) -> float:
        """Score likelihood of resource name column."""
        score = 0.0
        
        # Check column name
        if any(keyword in col.lower() for keyword in ["resource", "crew", "team", "person", "equipment"]):
            score += 0.4
        
        # Check values: text, limited unique values (typical for resources)
        if sample.dtype == 'object':
            unique_ratio = sample.nunique() / len(sample)
            if 0.1 < unique_ratio < 0.8:  # Moderate uniqueness (resource reuse)
                score += 0.4
        
        return score
    
    def _score_resource_qty(self, col: str, sample: pd.Series) -> float:
        """Score likelihood of resource quantity column."""
        score = 0.0
        
        # Check column name
        if any(keyword in col.lower() for keyword in ["quantity", "qty", "count", "units", "available"]):
            score += 0.4
        
        # Check values: small positive integers
        try:
            numeric = pd.to_numeric(sample, errors='coerce')
            if numeric.notna().sum() / len(sample) > 0.9:
                if (numeric.dropna() > 0).all() and (numeric.dropna() < 1000).all():
                    score += 0.5
        except:
            pass
        
        return score
    
    def _score_dependency(self, col: str, sample: pd.Series) -> float:
        """Score likelihood of task dependency column."""
        score = 0.0
        
        # Check column name
        if any(keyword in col.lower() for keyword in ["depend", "prerequisite", "before", "after", "predecessor"]):
            score += 0.4
        
        # Check values: task ID references or empty
        if sample.dtype == 'object':
            non_empty = sample.dropna()
            if len(non_empty) == 0:
                return 0.0  # All empty, might be placeholder
            
            # Check if values look like task IDs
            pattern_match = sum(1 for v in non_empty if re.match(r'^(T|TASK|Task)[\d_\w]*$', str(v)))
            if pattern_match / len(non_empty) > 0.6:
                score += 0.5
        
        return score
    
    def _score_priority(self, col: str, sample: pd.Series) -> float:
        """Score likelihood of priority column."""
        score = 0.0
        
        # Check column name
        if any(keyword in col.lower() for keyword in ["priority", "importance", "critical"]):
            score += 0.4
        
        # Check values: small integers or strings (low/medium/high)
        try:
            # Try numeric: 1-5 or similar
            numeric = pd.to_numeric(sample, errors='coerce')
            if numeric.notna().sum() / len(sample) > 0.8:
                if (numeric.dropna() >= 1).all() and (numeric.dropna() <= 5).all():
                    score += 0.5
            else:
                # Try categorical: high/medium/low
                if sample.dtype == 'object':
                    unique_vals = sample.unique()
                    if len(unique_vals) <= 5 and any(
                        keyword in str(v).lower() for v in unique_vals 
                        for keyword in ["high", "low", "medium", "critical", "normal"]
                    ):
                        score += 0.5
        except:
            pass
        
        return score
    
    def _score_cost(self, col: str, sample: pd.Series) -> float:
        """Score likelihood of cost column."""
        score = 0.0
        
        # Check column name
        if any(keyword in col.lower() for keyword in ["cost", "price", "budget", "expense"]):
            score += 0.4
        
        # Check values: decimal numbers, typically > 0
        try:
            numeric = pd.to_numeric(sample, errors='coerce')
            if numeric.notna().sum() / len(sample) > 0.8:
                if (numeric.dropna() > 0).all():
                    score += 0.5
        except:
            pass
        
        return score
```

### 2. Multi-Sheet/Section Detection

Planning spreadsheets often have multiple sections (TASKS, RESOURCES, CONSTRAINTS).

```python
class MultiSectionDetector:
    """Detect and separate multiple sections in planning spreadsheets."""
    
    def __init__(self, df: pd.DataFrame):
        self.df = df
        self.sections = {}
    
    def detect_sections(self) -> Dict[str, pd.DataFrame]:
        """
        Separate spreadsheet into sections by detecting:
        - Explicit section headers ("TASKS", "RESOURCES", "CONSTRAINTS")
        - Empty rows (section breaks)
        - Column pattern changes
        """
        sections = {}
        current_section = None
        current_data = []
        
        for idx, row in self.df.iterrows():
            row_str = str(row.iloc[0]).upper()
            
            # Check if this is a section header
            if self._is_section_header(row_str):
                if current_section and current_data:
                    sections[current_section] = pd.DataFrame(current_data)
                
                current_section = row_str
                current_data = []
            elif pd.isna(row.iloc[0]):  # Empty row - section break
                if current_section and current_data:
                    sections[current_section] = pd.DataFrame(current_data)
                    current_section = None
                    current_data = []
            else:
                current_data.append(row)
        
        # Don't forget last section
        if current_section and current_data:
            sections[current_section] = pd.DataFrame(current_data)
        
        return sections
    
    def _is_section_header(self, text: str) -> bool:
        """Check if text is a section header."""
        headers = ["TASKS", "RESOURCES", "CONSTRAINTS", "DEPENDENCIES", "ASSUMPTIONS"]
        return any(header in text for header in headers)
```

---

## Data Quality Issue Handling

### Common Issues & Mitigation Strategies

| Issue | Detection | Mitigation | Example |
|-------|-----------|-----------|---------|
| **Missing dates** | NaN in date columns | Use date coercion + fallback logic | `2026-02-20` or `2/20/2026` → parsed safely |
| **Inconsistent names** | Resource name variations (`Crew1` vs `crew1` vs `Crew #1`) | Normalize via fuzzy matching (fuzzywuzzy lib) | `Crew1` + `crew 1` → matched via similarity |
| **Blank cells** | Null values in required fields | Propagate previous value or highlight | Duration missing → inherit from template |
| **Wrong data types** | Numeric stored as text | Auto-convert with validation | `"1.5"` (text) → `1.5` (float) |
| **Circular dependencies** | Task A → B → A | Cycle detection algorithm | Reject with clear error message |
| **Negative values** | Duration < 0 | Filter against business rules | Duration -5 → error: "Must be positive" |
| **Outlier values** | Duration 99999 days | Statistical outlier detection | Flag for user review |

### Robust Data Cleaning Implementation

```python
from typing import Tuple
from fuzzywuzzy import fuzz, process
import logging

logger = logging.getLogger(__name__)

class DataQualityCleaner:
    """Handle data quality issues in planning spreadsheets."""
    
    def __init__(self, df: pd.DataFrame, column_types: Dict[str, str]):
        self.df = df.copy()
        self.column_types = column_types
        self.quality_report = {
            "issues_found": [],
            "issues_fixed": [],
            "issues_unfixable": [],
        }
    
    def clean(self) -> Tuple[pd.DataFrame, Dict]:
        """
        Execute all cleaning operations and return cleaned DF + quality report.
        """
        self._handle_missing_dates()
        self._normalize_resource_names()
        self._handle_blank_cells()
        self._validate_data_types()
        self._fix_duration_values()
        self._detect_circular_dependencies()
        
        return self.df, self.quality_report
    
    def _handle_missing_dates(self):
        """Handle missing or malformed dates."""
        date_cols = [col for col, typ in self.column_types.items() if typ == "date"]
        
        for col in date_cols:
            missing_count = self.df[col].isna().sum()
            
            if missing_count == 0:
                continue
            
            self.quality_report["issues_found"].append({
                "type": "missing_date",
                "column": col,
                "count": missing_count,
                "rows": self.df[self.df[col].isna()].index.tolist(),
            })
            
            # Try to fill with inferred values
            if missing_count < len(self.df) * 0.3:  # < 30% missing
                # Forward fill or use mode
                self.df[col] = pd.to_datetime(
                    self.df[col], 
                    errors='coerce'
                ).fillna(method='ffill').fillna(method='bfill')
                
                self.quality_report["issues_fixed"].append({
                    "type": "missing_date",
                    "column": col,
                    "action": "filled_via_forward_fill",
                })
            else:
                # Too many missing - unfixable
                self.quality_report["issues_unfixable"].append({
                    "type": "missing_date",
                    "column": col,
                    "action": "require_user_specification",
                })
    
    def _normalize_resource_names(self):
        """
        Normalize resource names: handle variations like 'Crew1', 'crew1', 'Crew #1'.
        Use fuzzy matching to group similar names.
        """
        resource_cols = [col for col, typ in self.column_types.items() 
                        if typ in ["resource_name", "resource_qty"]]
        
        for col in resource_cols:
            unique_resources = self.df[col].dropna().unique()
            
            if len(unique_resources) == 0:
                continue
            
            # Build mapping of similar names
            canonical_map = {}
            processed = set()
            
            for resource in unique_resources:
                if resource in processed:
                    continue
                
                # Find similar names
                similar = [r for r in unique_resources 
                          if fuzz.token_sort_ratio(str(resource), str(r)) > 85]
                
                # Canonical form: most common, alphabetically first
                canonical = sorted(similar)[0]
                
                for variant in similar:
                    canonical_map[variant] = canonical
                    processed.add(variant)
            
            # Apply mapping
            if canonical_map:
                self.df[col] = self.df[col].map(lambda x: canonical_map.get(x, x))
                
                self.quality_report["issues_fixed"].append({
                    "type": "inconsistent_resource_names",
                    "column": col,
                    "mappings_applied": len(canonical_map),
                    "action": "normalized_via_fuzzy_matching",
                })
    
    def _handle_blank_cells(self):
        """
        Properly handle blank cells based on context:
        - Required fields: flag as unfixable
        - Optional fields: fill with defaults
        - Duration/dependency: inherit from context
        """
        required_fields_per_type = {
            "task_id": True,
            "task_name": True,
            "date": False,  # Optional, can infer
            "duration": True,
            "resource_name": False,  # Optional
            "dependency": False,
        }
        
        for col, col_type in self.column_types.items():
            blank_count = self.df[col].isna().sum() + (self.df[col] == '').sum()
            
            if blank_count == 0:
                continue
            
            is_required = required_fields_per_type.get(col_type, False)
            
            if is_required:
                self.quality_report["issues_unfixable"].append({
                    "type": "missing_required_field",
                    "column": col,
                    "count": blank_count,
                    "action": "require_user_input",
                })
            else:
                # Fill optional fields with sensible defaults
                if col_type == "duration":
                    self.df[col] = self.df[col].fillna(1)  # Default: 1 day
                elif col_type == "dependency":
                    self.df[col] = self.df[col].fillna("")  # Empty = no dependency
                
                self.quality_report["issues_fixed"].append({
                    "type": "missing_optional_field",
                    "column": col,
                    "count": blank_count,
                    "action": "filled_with_defaults",
                })
    
    def _validate_data_types(self):
        """
        Validate and coerce data types to expected formats.
        """
        for col, col_type in self.column_types.items():
            try:
                if col_type == "duration":
                    self.df[col] = pd.to_numeric(self.df[col], errors='coerce')
                    invalid = self.df[self.df[col].isna()].index.tolist()
                    if invalid:
                        self.quality_report["issues_found"].append({
                            "type": "invalid_numeric_value",
                            "column": col,
                            "affected_rows": invalid,
                        })
                
                elif col_type == "date":
                    self.df[col] = pd.to_datetime(self.df[col], errors='coerce')
                    invalid = self.df[self.df[col].isna()].index.tolist()
                    if invalid:
                        self.quality_report["issues_found"].append({
                            "type": "invalid_date_format",
                            "column": col,
                            "affected_rows": invalid,
                        })
                
                elif col_type == "cost":
                    self.df[col] = pd.to_numeric(self.df[col], errors='coerce')
            
            except Exception as e:
                logger.warning(f"Type coercion failed for {col}: {e}")
    
    def _fix_duration_values(self):
        """
        Validate duration values: should be positive integers.
        Flag outliers (e.g., > 500 days).
        """
        duration_cols = [col for col, typ in self.column_types.items() if typ == "duration"]
        
        for col in duration_cols:
            # Check for negative
            negatives = self.df[self.df[col] < 0].index.tolist()
            if negatives:
                self.quality_report["issues_found"].append({
                    "type": "negative_duration",
                    "column": col,
                    "affected_rows": negatives,
                })
                # Fix: take absolute value
                self.df.loc[negatives, col] = self.df.loc[negatives, col].abs()
            
            # Check for outliers (statistical z-score)
            mean_dur = self.df[col].mean()
            std_dur = self.df[col].std()
            outlier_threshold = mean_dur + (3 * std_dur)  # 3-sigma rule
            
            outliers = self.df[self.df[col] > outlier_threshold].index.tolist()
            if outliers:
                self.quality_report["issues_found"].append({
                    "type": "outlier_duration",
                    "column": col,
                    "threshold": outlier_threshold,
                    "affected_rows": outliers,
                    "suggestion": "Review and confirm with planner",
                })
    
    def _detect_circular_dependencies(self):
        """
        Detect circular task dependencies (Task A → B → A).
        """
        task_id_cols = [col for col, typ in self.column_types.items() if typ == "task_id"]
        dep_cols = [col for col, typ in self.column_types.items() if typ == "dependency"]
        
        if not task_id_cols or not dep_cols:
            return
        
        # Build dependency graph
        task_col = task_id_cols[0]
        dep_col = dep_cols[0]
        
        graph = {}
        for _, row in self.df.iterrows():
            task = row[task_col]
            dep = row[dep_col]
            if pd.notna(dep) and pd.notna(task):
                if task not in graph:
                    graph[task] = []
                graph[task].append(dep)
        
        # DFS cycle detection
        def has_cycle(node, visited, rec_stack):
            visited.add(node)
            rec_stack.add(node)
            
            for neighbor in graph.get(node, []):
                if neighbor not in visited:
                    if has_cycle(neighbor, visited, rec_stack):
                        return True
                elif neighbor in rec_stack:
                    return True
            
            rec_stack.remove(node)
            return False
        
        visited = set()
        for node in graph:
            if node not in visited:
                if has_cycle(node, visited, set()):
                    self.quality_report["issues_unfixable"].append({
                        "type": "circular_dependency",
                        "starting_node": node,
                        "action": "require_user_resolution",
                    })
```

---

## Mapping to Planning Entities

### Entity Models (Pydantic)

These map parsed data to planning domain objects:

```python
from pydantic import BaseModel, Field, validator
from datetime import datetime, date
from typing import Optional, List

class TaskEntity(BaseModel):
    """Task entity in planning."""
    id: str = Field(..., description="Unique task identifier")
    name: str = Field(..., description="Human-readable task name")
    description: Optional[str] = Field(None, description="Task description")
    duration_days: int = Field(..., ge=1, description="Task duration in days")
    start_date: Optional[date] = Field(None, description="Planned start date")
    end_date: Optional[date] = Field(None, description="Planned end date")
    dependencies: List[str] = Field(default_factory=list, description="IDs of dependent tasks")
    assigned_resource: Optional[str] = Field(None, description="Assigned resource name")
    priority: int = Field(default=1, ge=1, le=5, description="Priority (1=low, 5=high)")
    estimated_cost: Optional[float] = Field(None, ge=0, description="Estimated task cost")
    
    @validator('end_date')
    def end_date_after_start(cls, v, values):
        if v and 'start_date' in values and values['start_date']:
            if v <= values['start_date']:
                raise ValueError("end_date must be after start_date")
        return v

class ResourceEntity(BaseModel):
    """Resource entity in planning."""
    name: str = Field(..., description="Resource name")
    category: str = Field(default="general", description="Resource category (crew, equipment, etc.)")
    available_units: int = Field(..., ge=1, description="Number of available units")
    hourly_rate: Optional[float] = Field(None, ge=0, description="Cost per unit per hour")
    skills: List[str] = Field(default_factory=list, description="Skills/certifications")
    max_hours_per_day: Optional[int] = Field(8, description="Max working hours per day")

class ConstraintEntity(BaseModel):
    """Constraint entity in planning."""
    id: str = Field(..., description="Unique constraint ID")
    name: str = Field(..., description="Constraint name")
    description: str = Field(..., description="Constraint description")
    constraint_type: str = Field(..., description="Type: capacity|schedule|resource|skill|dependency")
    affected_tasks: List[str] = Field(default_factory=list, description="Task IDs affected")
    affected_resources: List[str] = Field(default_factory=list, description="Resource names affected")
    severity: str = Field(default="medium", description="hard|soft|medium")

class PlanningDataModel(BaseModel):
    """Complete parsed planning data."""
    tasks: List[TaskEntity]
    resources: List[ResourceEntity]
    constraints: List[ConstraintEntity] = Field(default_factory=list)
    metadata: dict = Field(default_factory=dict, description="Original file metadata")
    import_timestamp: datetime = Field(default_factory=datetime.utcnow)
    data_quality_report: Optional[dict] = None
```

### Column Mapping Strategy

```python
class ColumnMapper:
    """Map detected columns to planning entities."""
    
    def __init__(self, df: pd.DataFrame, column_types: Dict[str, str]):
        self.df = df
        self.column_types = column_types
        self.mapping = self._build_mapping()
    
    def _build_mapping(self) -> Dict[str, str]:
        """
        Build mapping: DataFrame column → Entity field.
        
        Example:
        {
            'Task ID': 'task_id',
            'Task Name': 'task_name',
            'Duration (Days)': 'duration_days',
            ...
        }
        """
        mapping = {}
        
        for col, detected_type in self.column_types.items():
            if detected_type != "unknown":
                mapping[col] = detected_type
        
        return mapping
    
    def extract_tasks(self) -> List[TaskEntity]:
        """Extract tasks from mapped columns."""
        tasks = []
        
        task_id_cols = [col for col, typ in self.column_types.items() if typ == "task_id"]
        task_name_cols = [col for col, typ in self.column_types.items() if typ == "task_name"]
        duration_cols = [col for col, typ in self.column_types.items() if typ == "duration"]
        date_cols = [col for col, typ in self.column_types.items() if typ == "date"]
        dep_cols = [col for col, typ in self.column_types.items() if typ == "dependency"]
        resource_cols = [col for col, typ in self.column_types.items() if typ == "resource_name"]
        priority_cols = [col for col, typ in self.column_types.items() if typ == "priority"]
        cost_cols = [col for col, typ in self.column_types.items() if typ == "cost"]
        
        for idx, row in self.df.iterrows():
            try:
                task_id = str(row[task_id_cols[0]]) if task_id_cols else f"TASK_{idx}"
                task_name = str(row[task_name_cols[0]]) if task_name_cols else f"Task {idx}"
                duration = int(row[duration_cols[0]]) if duration_cols and pd.notna(row[duration_cols[0]]) else 1
                
                task = TaskEntity(
                    id=task_id,
                    name=task_name,
                    duration_days=duration,
                    start_date=pd.to_datetime(row[date_cols[0]], errors='coerce').date() if date_cols else None,
                    dependencies=str(row[dep_cols[0]]).split(',') if dep_cols and pd.notna(row[dep_cols[0]]) else [],
                    assigned_resource=str(row[resource_cols[0]]) if resource_cols and pd.notna(row[resource_cols[0]]) else None,
                    priority=int(row[priority_cols[0]]) if priority_cols and pd.notna(row[priority_cols[0]]) else 1,
                    estimated_cost=float(row[cost_cols[0]]) if cost_cols and pd.notna(row[cost_cols[0]]) else None,
                )
                tasks.append(task)
            
            except Exception as e:
                logger.warning(f"Failed to parse task at row {idx}: {e}")
        
        return tasks
    
    def extract_resources(self) -> List[ResourceEntity]:
        """Extract resources from mapped columns."""
        resources = []
        
        resource_name_cols = [col for col, typ in self.column_types.items() if typ == "resource_name"]
        resource_qty_cols = [col for col, typ in self.column_types.items() if typ == "resource_qty"]
        
        if not resource_name_cols:
            return resources
        
        # Group by resource name
        resource_name_col = resource_name_cols[0]
        for resource_name in self.df[resource_name_col].dropna().unique():
            try:
                qty_col_data = self.df[self.df[resource_name_col] == resource_name][resource_qty_cols[0]] if resource_qty_cols else None
                qty = int(qty_col_data.iloc[0]) if qty_col_data is not None and pd.notna(qty_col_data.iloc[0]) else 1
                
                resource = ResourceEntity(
                    name=str(resource_name),
                    available_units=qty,
                )
                resources.append(resource)
            
            except Exception as e:
                logger.warning(f"Failed to parse resource {resource_name}: {e}")
        
        return resources
```

---

## Validation & Error Reporting

### Multi-Level Validation

```python
from enum import Enum

class ValidationLevel(Enum):
    ERROR = "error"      # Blocks import
    WARNING = "warning"  # Import continues, but note issue
    INFO = "info"        # Informational

class ImportValidationError(BaseModel):
    """Validation error for spreadsheet import."""
    level: ValidationLevel
    code: str  # "invalid_dependency", "missing_date", etc.
    message: str
    affected_rows: Optional[List[int]] = None
    affected_columns: Optional[List[str]] = None
    suggestion: str  # How to fix it

class ValidationResult(BaseModel):
    """Result of validation pass."""
    is_valid: bool
    errors: List[ImportValidationError]
    warnings: List[ImportValidationError]
    summary: str
    import_allowed: bool  # True if only warnings, no errors

class SpreadsheetValidator:
    """Comprehensive validator for imported planning data."""
    
    def __init__(self, tasks: List[TaskEntity], resources: List[ResourceEntity]):
        self.tasks = tasks
        self.resources = resources
        self.errors = []
        self.warnings = []
    
    def validate(self) -> ValidationResult:
        """Run all validation checks."""
        self._validate_tasks()
        self._validate_resources()
        self._validate_dependencies()
        self._validate_resource_assignments()
        self._validate_dates()
        
        import_allowed = len(self.errors) == 0
        
        return ValidationResult(
            is_valid=import_allowed,
            errors=self.errors,
            warnings=self.warnings,
            summary=self._build_summary(),
            import_allowed=import_allowed,
        )
    
    def _validate_tasks(self):
        """Validate task data."""
        # Check for duplicate task IDs
        task_ids = [t.id for t in self.tasks]
        if len(task_ids) != len(set(task_ids)):
            duplicates = [tid for tid in task_ids if task_ids.count(tid) > 1]
            self.errors.append(ImportValidationError(
                level=ValidationLevel.ERROR,
                code="duplicate_task_ids",
                message=f"Duplicate task IDs found: {', '.join(duplicates)}",
                suggestion="Ensure each task has a unique ID",
            ))
        
        # Check for invalid durations
        for task in self.tasks:
            if task.duration_days < 1:
                self.errors.append(ImportValidationError(
                    level=ValidationLevel.ERROR,
                    code="invalid_duration",
                    message=f"Task {task.id} has invalid duration: {task.duration_days} days",
                    affected_rows=[i for i, t in enumerate(self.tasks) if t.id == task.id],
                    suggestion="Duration must be >= 1 day",
                ))
    
    def _validate_resources(self):
        """Validate resource data."""
        # Check for duplicate resource names
        resource_names = [r.name for r in self.resources]
        if len(resource_names) != len(set(resource_names)):
            duplicates = [name for name in resource_names if resource_names.count(name) > 1]
            self.warnings.append(ImportValidationError(
                level=ValidationLevel.WARNING,
                code="duplicate_resource_names",
                message=f"Duplicate resource names found: {', '.join(duplicates)}",
                suggestion="Consider renaming to make resources unique, or consolidate quantities",
            ))
        
        # Check for invalid quantities
        for resource in self.resources:
            if resource.available_units < 1:
                self.errors.append(ImportValidationError(
                    level=ValidationLevel.ERROR,
                    code="invalid_resource_quantity",
                    message=f"Resource {resource.name} has invalid quantity: {resource.available_units}",
                    suggestion="Resource quantity must be >= 1",
                ))
    
    def _validate_dependencies(self):
        """Validate task dependencies."""
        task_ids = {t.id for t in self.tasks}
        
        for task in self.tasks:
            for dep_id in task.dependencies:
                if dep_id not in task_ids:
                    self.errors.append(ImportValidationError(
                        level=ValidationLevel.ERROR,
                        code="invalid_dependency",
                        message=f"Task {task.id} depends on non-existent task {dep_id}",
                        affected_columns=["dependency"],
                        suggestion=f"Check if task ID '{dep_id}' exists or fix the task ID reference",
                    ))
    
    def _validate_resource_assignments(self):
        """Validate resource assignments."""
        assigned_resources = set()
        
        for task in self.tasks:
            if task.assigned_resource:
                assigned_resources.add(task.assigned_resource)
        
        available_resources = {r.name for r in self.resources}
        
        for assigned in assigned_resources:
            if assigned not in available_resources:
                self.warnings.append(ImportValidationError(
                    level=ValidationLevel.WARNING,
                    code="unknown_resource_assignment",
                    message=f"Task assigned to unknown resource: {assigned}",
                    suggestion=f"Create resource '{assigned}' or reassign task",
                ))
    
    def _validate_dates(self):
        """Validate date logic."""
        for task in self.tasks:
            if task.start_date and task.end_date:
                if task.end_date <= task.start_date:
                    self.errors.append(ImportValidationError(
                        level=ValidationLevel.ERROR,
                        code="invalid_date_range",
                        message=f"Task {task.id}: end_date is not after start_date",
                        suggestion="Ensure end_date > start_date",
                    ))
    
    def _build_summary(self) -> str:
        """Build human-readable summary."""
        lines = []
        lines.append(f"✓ Imported: {len(self.tasks)} tasks, {len(self.resources)} resources")
        
        if self.errors:
            lines.append(f"✗ Errors: {len(self.errors)} issues block import")
        
        if self.warnings:
            lines.append(f"⚠ Warnings: {len(self.warnings)} issues to review")
        
        if not self.errors and not self.warnings:
            lines.append("✓ All validations passed!")
        
        return "\n".join(lines)
```

---

## Sample Code: Shipyard Planning Parser

### Complete Parser Implementation

```python
"""
Integrated shipyard planning spreadsheet parser.
Combines all components: detection, cleaning, mapping, validation.
"""

import io
import logging
from typing import Tuple, Union

import pandas as pd
from openpyxl import load_workbook

logger = logging.getLogger(__name__)

class ShipyardPlanningParser:
    """End-to-end parser for shipyard planning spreadsheets."""
    
    def __init__(self, file_content: Union[bytes, str], filename: str):
        """
        Initialize parser with file content.
        
        Args:
            file_content: Raw file bytes or string content
            filename: Original filename (used to detect type)
        """
        self.file_content = file_content
        self.filename = filename
        self.file_type = self._detect_file_type()
        self.df = None
        self.column_types = {}
        self.quality_report = {}
        self.parsed_data = None
        self.validation_result = None
    
    def _detect_file_type(self) -> str:
        """Detect if file is CSV or Excel."""
        filename_lower = self.filename.lower()
        if filename_lower.endswith('.xlsx') or filename_lower.endswith('.xls'):
            return "excel"
        else:
            return "csv"
    
    def parse(self) -> Tuple[PlanningDataModel, ValidationResult]:
        """
        Execute full parsing pipeline.
        
        Returns:
            (PlanningDataModel, ValidationResult)
        """
        try:
            # Step 1: Load file
            self.df = self._load_file()
            logger.info(f"Loaded {len(self.df)} rows, {len(self.df.columns)} columns")
            
            # Step 2: Infer column types
            detector = ColumnTypeDetector(self.df)
            self.column_types = detector.detect_column_types()
            logger.info(f"Detected column types: {self.column_types}")
            
            # Step 3: Clean data
            cleaner = DataQualityCleaner(self.df, self.column_types)
            self.df, self.quality_report = cleaner.clean()
            logger.info(f"Data cleaned. Issues: {len(self.quality_report['issues_found'])}")
            
            # Step 4: Map to entities
            mapper = ColumnMapper(self.df, self.column_types)
            tasks = mapper.extract_tasks()
            resources = mapper.extract_resources()
            logger.info(f"Mapped {len(tasks)} tasks, {len(resources)} resources")
            
            # Step 5: Validate
            validator = SpreadsheetValidator(tasks, resources)
            self.validation_result = validator.validate()
            logger.info(f"Validation: {self.validation_result.summary}")
            
            # Step 6: Build model
            self.parsed_data = PlanningDataModel(
                tasks=tasks,
                resources=resources,
                constraints=[],
                metadata={
                    "source_filename": self.filename,
                    "file_type": self.file_type,
                },
                data_quality_report=self.quality_report,
            )
            
            return self.parsed_data, self.validation_result
        
        except Exception as e:
            logger.error(f"Parse failed: {e}", exc_info=True)
            raise
    
    def _load_file(self) -> pd.DataFrame:
        """Load CSV or Excel file."""
        if self.file_type == "excel":
            return pd.read_excel(io.BytesIO(self.file_content))
        else:
            # Detect encoding for CSV
            import chardet
            encoding = chardet.detect(self.file_content)['encoding']
            return pd.read_csv(
                io.StringIO(self.file_content.decode(encoding or 'utf-8')),
                skipinitialspace=True,
            )
```

### Example Shipyard Spreadsheet Layout

**Example 1: Compact Format**

```
Task ID,Task Name,Duration (Days),Start Date,End Date,Resource,Dependency,Priority
T001,Foundation Prep,5,2026-03-01,2026-03-05,Crew1,,1
T002,Hull Assembly,20,2026-03-06,2026-03-25,Crew1,T001,2
T003,Electrical System,15,2026-03-26,2026-04-10,Crew2,T002,2
T004,Testing & QA,10,2026-04-11,2026-04-20,Crew3,T003,3
```

**Example 2: Multi-Section Format**

```
TASKS
Task ID,Task Name,Duration,Resource,Depends On
T001,Keel Laying,10,StructuralTeam,
T002,Hull Construction,30,StructuralTeam,T001
T003,Interior Outfitting,20,FinishTeam,T002

RESOURCES
Resource Name,Available Units,Skills
StructuralTeam,8,welding|assembly
FinishTeam,5,painting|fitting
QATeam,3,inspection|testing

CONSTRAINTS
Constraint Type,Description,Affected Tasks
capacity,Dock availability limited to 8 hours/day,T001|T002
skill_requirement,Welding tasks need certified welders,T001|T002
```

---

## FastAPI Integration Pattern

### File Upload Endpoint

```python
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import logging

app = FastAPI(title="Planning Data Importer")
logger = logging.getLogger(__name__)

@app.post("/api/planning/import-spreadsheet")
async def import_planning_spreadsheet(
    file: UploadFile = File(...),
    optimization_goal: str = "balance",
) -> dict:
    """
    Upload and parse planning spreadsheet.
    
    Returns:
    - If valid: {status: "success", data: PlanningDataModel, validation: ValidationResult}
    - If errors: {status: "error", validation: ValidationResult with errors}
    """
    
    try:
        # Validate file type
        allowed_types = [
            "text/csv",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ]
        
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type: {file.content_type}. Supported: CSV, XLS, XLSX",
            )
        
        # Read file
        content = await file.read()
        
        if not content:
            raise HTTPException(status_code=400, detail="File is empty")
        
        if len(content) > 10 * 1024 * 1024:  # 10 MB limit
            raise HTTPException(status_code=413, detail="File too large (max 10 MB)")
        
        # Parse
        parser = ShipyardPlanningParser(content, file.filename)
        parsed_data, validation = parser.parse()
        
        # Return based on validation status
        response = {
            "status": "success" if validation.import_allowed else "validation_warnings",
            "filename": file.filename,
            "import_allowed": validation.import_allowed,
            "validation": {
                "is_valid": validation.is_valid,
                "summary": validation.summary,
                "errors": [
                    {
                        "code": e.code,
                        "message": e.message,
                        "suggestion": e.suggestion,
                    }
                    for e in validation.errors
                ],
                "warnings": [
                    {
                        "code": w.code,
                        "message": w.message,
                        "suggestion": w.suggestion,
                    }
                    for w in validation.warnings
                ],
            },
            "data_summary": {
                "tasks_count": len(parsed_data.tasks),
                "resources_count": len(parsed_data.resources),
                "constraints_count": len(parsed_data.constraints),
            },
        }
        
        # Include parsed data if import allowed
        if validation.import_allowed:
            response["data"] = parsed_data.dict()
        
        return response
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Import error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal error processing file")

@app.get("/api/planning/import/template")
async def get_import_template() -> dict:
    """
    Get template for users to prepare spreadsheets correctly.
    """
    return {
        "description": "Planning spreadsheet import template",
        "formats": {
            "compact": {
                "description": "Single-sheet format with all data",
                "headers": [
                    "Task ID",
                    "Task Name",
                    "Duration (Days)",
                    "Start Date",
                    "End Date",
                    "Resource",
                    "Dependency",
                    "Priority",
                ],
                "example": [
                    {
                        "Task ID": "T001",
                        "Task Name": "Foundation Prep",
                        "Duration (Days)": 5,
                        "Start Date": "2026-03-01",
                        "End Date": "2026-03-05",
                        "Resource": "Crew1",
                        "Dependency": "",
                        "Priority": 1,
                    },
                    {
                        "Task ID": "T002",
                        "Task Name": "Hull Assembly",
                        "Duration (Days)": 20,
                        "Resource": "Crew1",
                        "Dependency": "T001",
                        "Priority": 2,
                    },
                ]
            },
            "multi_section": {
                "description": "Multi-section format for complex planning",
                "sections": ["TASKS", "RESOURCES", "CONSTRAINTS"],
            }
        },
        "guidelines": [
            "Task ID must be unique",
            "Duration must be positive integer (days)",
            "Dates can be in any common format (2026-03-01, 3/1/2026, March 1, 2026)",
            "Resource names should be consistent (avoid 'Crew1' vs 'crew1')",
            "Dependencies should reference Task IDs separated by commas (T001,T002)",
            "Priority: 1=Low, 5=High (optional, defaults to 1)",
            "Blank cells are OK for optional columns (dates, dependency, etc.)",
        ],
        "limits": {
            "max_tasks": 1000,
            "max_resources": 200,
            "max_file_size_mb": 10,
        }
    }
```

---

## User Templates & Best Practices

### Template 1: Minimal Valid Spreadsheet

**When to use**: Quick planning, simple sequential tasks

| Task ID | Task Name | Duration (Days) |
|---------|-----------|-----------------|
| T001 | Foundation | 5 |
| T002 | Hull Assembly | 20 |
| T003 | Testing | 10 |

**CSV version**:
```
Task ID,Task Name,Duration (Days)
T001,Foundation,5
T002,Hull Assembly,20
T003,Testing,10
```

### Template 2: Complete Planning Spreadsheet

**When to use**: Full project planning with dependencies, resources, dates

| Task ID | Task Name | Duration (Days) | Start Date | Resource | Dependency | Priority | Est. Cost |
|---------|-----------|-----------------|------------|----------|-----------|----------|-----------|
| T001 | Keel Laying | 10 | 2026-03-01 | Structural | | 5 | 50000 |
| T002 | Hull Construction | 30 | 2026-03-11 | Structural | T001 | 4 | 150000 |
| T003 | Electrical System | 15 | 2026-04-10 | Electrical | T002 | 3 | 75000 |
| T004 | Interior Outfitting | 20 | 2026-04-25 | Interior | T003 | 2 | 100000 |
| T005 | Testing & QA | 5 | 2026-05-15 | QA | T004 | 5 | 25000 |

### Template 3: Multi-Section Spreadsheet

**When to use**: Large projects with explicit sections

```
SECTION,TASKS
Task ID,Name,Days,Depends On
T001,Keel,10,
T002,Hull,30,T001
T003,Systems,20,T002

SECTION,RESOURCES
Name,Category,Units,Skills
StructuralTeam,Labor,8,"welding,assembly"
ElectricalTeam,Labor,5,"electrical,safety"
Cranes,Equipment,2,"heavy_lifting"

SECTION,CONSTRAINTS
Type,Name,Affected Items,Severity
capacity,Dock Hours,T001|T002,hard
weather,Dry Season Only,T001|T002|T003,soft
skill,Welding Certification,T001|T002,hard
```

### Best Practices Guide

**DO:**
- ✅ Use consistent date format (YYYY-MM-DD, MM/DD/YYYY, or spelled out)
- ✅ Keep task IDs short and alphanumeric (T001, TASK_001)
- ✅ Use resource names consistently (Crew1 not Crew 1 or crew1)
- ✅ Keep task names descriptive but concise (< 100 chars)
- ✅ Mark dependencies clearly (T001,T002 for multiple)
- ✅ Use positive integers for duration
- ✅ Keep one task per row (don't merge cells)

**DON'T:**
- ❌ Mix resource name styles (Crew1, crew_1, CREW1 - pick one)
- ❌ Use special characters in IDs (T001$ or Task #1)
- ❌ Leave critical fields blank (Task ID, Task Name, Duration)
- ❌ Put multiple values in one cell (duration should be single number, not "5-7 days")
- ❌ Use hidden rows or columns (system may miss them)
- ❌ Include headers mid-spreadsheet (put all headers at top)
- ❌ Use merged cells (causes parsing issues)
- ❌ Reference tasks that don't exist in dependencies
- ❌ Create circular dependencies (T1→T2→T1)

**Data Quality Checklist:**

Before uploading, verify:
- [ ] All task IDs are unique
- [ ] All task names are non-empty
- [ ] All durations are positive integers
- [ ] All date formats are consistent
- [ ] All dependencies reference existing tasks
- [ ] All assigned resources exist (or are created in RESOURCES section)
- [ ] No circular dependencies (Task A depends on B which depends on A)
- [ ] Resource names are spelled consistently
- [ ] No blank rows or columns in the middle of data
- [ ] File is .CSV or .XLSX format (not .XLS or other)

---

## Summary & Recommendations

### Library Selection Summary

| Goal | Primary | Fallback |
|------|---------|----------|
| Parse CSV + auto-type detection | **pandas** | csv + manual typing |
| Parse Excel .xlsx | **openpyxl + pandas** | xlrd (deprecated) |
| Encoding detection | **chardet** | UTF-8 assumption |
| Validate structured data | **pydantic** | custom validators |
| Fuzzy matching (resource names) | **fuzzywuzzy** | string similarity |

### Implementation Roadmap

**Phase 1 (MVP - 1 week)**:
- [ ] CSV parser with pandas
- [ ] Basic column type detection (ColumnTypeDetector)
- [ ] Pydantic models (Task, Resource, Constraint)
- [ ] FastAPI upload endpoint
- [ ] Basic validation (no errors → allow import)

**Phase 2 (Production - 2 weeks)**:
- [ ] Excel support (openpyxl)
- [ ] Data quality cleaning (DataQualityCleaner)
- [ ] Comprehensive validation (SpreadsheetValidator)
- [ ] Template generation endpoint
- [ ] Error/warning reporting

**Phase 3 (Advanced - 3 weeks)**:
- [ ] Multi-section detection (TASKS | RESOURCES...)
- [ ] Fuzzy resource name matching
- [ ] Circular dependency detection
- [ ] Constraint inference from spreadsheet  
- [ ] User guidance (import template, best practices)

### Error Handling Patterns

**Pattern 1: Graceful Degradation**
```python
# Try strict parsing, fall back to lenient
try:
    date = pd.to_datetime(value, format='%Y-%m-%d')
except:
    date = pd.to_datetime(value, errors='coerce')  # Best effort
```

**Pattern 2: Accumulate & Report**
```python
# Collect all errors, don't fail on first one
errors = []
for row in data:
    try:
        validate(row)
    except Exception as e:
        errors.append((row_num, e))

if errors:
    raise BulkValidationError(errors)
```

**Pattern 3: Clear User Guidance**
```python
# Don't just say "error", say how to fix it
if dep_id not in task_ids:
    raise ValidationError(
        f"Task T002 references non-existent task '{dep_id}'",
        suggestion="Check task ID spelling or create the referenced task",
    )
```

---

## References & Further Reading

- **Pandas docs**: https://pandas.pydata.org/docs/ - Data parsing & transformation
- **OpenPyXL docs**: https://openpyxl.readthedocs.io/ - Excel .xlsx handling
- **Chardet**: https://chardet.readthedocs.io/ - Encoding detection
- **Pydantic**: https://docs.pydantic.dev/ - Data validation
- **FastAPI File Uploads**: https://fastapi.tiangolo.com/tutorial/request-files/
- **FuzzyWuzzy**: https://github.com/seatgeek/fuzzywuzzy - String matching

