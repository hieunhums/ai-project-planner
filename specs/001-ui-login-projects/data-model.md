# Data Model: UI Login and Project Landing

## Entities

### Project

- **Purpose**: Named workspace that groups uploads and generated plans.
- **Fields**:
  - `id` (int, primary key)
  - `name` (string, required, max 255)
  - `created_at` (datetime)
  - `updated_at` (datetime)
- **Validation**:
  - Name is required and non-empty.
  - Name is unique within the local demo scope (optional, but recommended).
- **Relationships**:
  - One Project has many Plans.

### Plan

- **Purpose**: A planning artifact (uploaded human plan or AI-generated plan).
- **Fields** (existing + additions):
  - `id` (int, primary key)
  - `project_id` (int, required, FK -> Project)
  - `name` (string)
  - `description` (string, optional)
  - `status` (enum: uploaded, parsing, generating, completed, failed)
  - `lineage` (enum: human_created, ai_generated, hybrid)
  - `created_at` (datetime)
  - `updated_at` (datetime)
  - `source_file_path` (string, optional)
  - `source_file_name` (string, optional)
  - `base_plan_id` (int, optional, for AI plans referencing their human plan)
- **Validation**:
  - `project_id` required for all plans.
  - `source_file_name` required for human-uploaded plans.
- **State transitions**:
  - uploaded -> generating -> completed
  - uploaded -> failed

### UploadSummary (projection)

- **Purpose**: UI-facing summary of uploaded files for a project.
- **Fields**:
  - `plan_id` (int)
  - `file_name` (string)
  - `uploaded_at` (datetime)
  - `status_label` (string: Uploaded, Generating, Completed, Failed)

### GeneratedPlanSummary (projection)

- **Purpose**: UI-facing summary of generated plans for a project.
- **Fields**:
  - `plan_id` (int)
  - `name` (string)
  - `generated_at` (datetime)
  - `status_label` (string)

## Notes

- Uploads are represented by plans with `lineage = human_created`.
- Generated plans are represented by plans with `lineage = ai_generated` and `base_plan_id` set.
