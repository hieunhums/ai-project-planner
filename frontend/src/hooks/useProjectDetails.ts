import { useState, useCallback } from 'react';
import { saveProjectDetails, type SaveProjectDetailsResponse } from '../services/api';
import type { CapacityPlanRow } from '../services/types';
import { saveHumanPlanState } from '../services/session';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REQUIRED_CSV_COLUMNS = new Set([
  'project_id',
  'project_name',
  'duration_days',
  'start_date',
  'end_date',
  'resource',
  'dependencies',
  'cost',
  'priority',
]);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProjectDetailsFormValues {
  project_type: 'confirmed' | 'enquiry';
  project_name: string;
  start_date: string;
  end_date: string;
  hull_length: string;
  hull_width: string;
  hull_height: string;
  topside_weight: string;
  preferred_location: string;
  preferred_yard: string;
  processes: string[];
  block_breakdown: string;
  project_ref_file: File | null;
  human_plan_file: File | null;
}

export interface FileValidationResult {
  valid: boolean;
  filename?: string;
  rowCount?: number;
  error?: string;
}

export interface FileErrors {
  project_ref?: string;
  human_plan?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validateCsvHeaders(content: string): { valid: boolean; missing: string[] } {
  const firstLine = content.split('\n')[0] ?? '';
  const cols = new Set(firstLine.split(',').map((c) => c.trim().toLowerCase()));
  const missing = [...REQUIRED_CSV_COLUMNS].filter((c) => !cols.has(c));
  return { valid: missing.length === 0, missing };
}

function parseAllRows(content: string): Record<string, string>[] {
  const lines = content.split('\n').filter((l) => l.trim() !== '');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const values = line.split(',');
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = (values[i] ?? '').trim();
    });
    return row;
  });
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) ?? '');
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

function countDataRows(content: string): number {
  return content
    .split('\n')
    .slice(1)
    .filter((l) => l.trim() !== '').length;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

const INITIAL_FORM_VALUES: ProjectDetailsFormValues = {
  project_type: 'enquiry',
  project_name: '',
  start_date: '',
  end_date: '',
  hull_length: '',
  hull_width: '',
  hull_height: '',
  topside_weight: '',
  preferred_location: '',
  preferred_yard: '',
  processes: [],
  block_breakdown: '',
  project_ref_file: null,
  human_plan_file: null,
};

export interface UseProjectDetailsReturn {
  formValues: ProjectDetailsFormValues;
  setField: <K extends keyof ProjectDetailsFormValues>(
    field: K,
    value: ProjectDetailsFormValues[K]
  ) => void;
  isValid: boolean;
  isSaving: boolean;
  fileErrors: FileErrors;
  fileInfo: { project_ref?: FileValidationResult; human_plan?: FileValidationResult };
  handleRefFileUpload: (file: File) => Promise<void>;
  handleHumanPlanUpload: (file: File) => Promise<void>;
  handleSubmit: () => Promise<SaveProjectDetailsResponse | null>;
}

export function useProjectDetails(
  projectId: number,
  initialName: string
): UseProjectDetailsReturn {
  const [formValues, setFormValues] = useState<ProjectDetailsFormValues>({
    ...INITIAL_FORM_VALUES,
    project_name: initialName,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [fileErrors, setFileErrors] = useState<FileErrors>({});
  const [fileInfo, setFileInfo] = useState<{
    project_ref?: FileValidationResult;
    human_plan?: FileValidationResult;
  }>({});

  // ------------------------------------------------------------------
  // setField
  // ------------------------------------------------------------------
  const setField = useCallback(
    <K extends keyof ProjectDetailsFormValues>(
      field: K,
      value: ProjectDetailsFormValues[K]
    ) => {
      setFormValues((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  // ------------------------------------------------------------------
  // isValid
  // ------------------------------------------------------------------
  const isValid: boolean = (() => {
    const {
      project_type,
      project_name,
      start_date,
      end_date,
      hull_length,
      hull_width,
      hull_height,
      topside_weight,
      preferred_location,
      preferred_yard,
      processes,
      block_breakdown,
      project_ref_file,
      human_plan_file,
    } = formValues;

    const textFieldsFilled =
      !!project_type &&
      project_name.trim() !== '' &&
      start_date.trim() !== '' &&
      end_date.trim() !== '' &&
      hull_length.trim() !== '' &&
      hull_width.trim() !== '' &&
      hull_height.trim() !== '' &&
      topside_weight.trim() !== '' &&
      preferred_location.trim() !== '' &&
      preferred_yard.trim() !== '' &&
      processes.length > 0 &&
      block_breakdown.trim() !== '';

    const filesValid =
      project_ref_file !== null &&
      human_plan_file !== null &&
      !fileErrors.project_ref &&
      !fileErrors.human_plan &&
      (fileInfo.project_ref?.valid ?? false) &&
      (fileInfo.human_plan?.valid ?? false);

    return textFieldsFilled && filesValid;
  })();

  // ------------------------------------------------------------------
  // handleRefFileUpload
  // ------------------------------------------------------------------
  const handleRefFileUpload = useCallback(
    async (file: File) => {
      setFileErrors((prev) => ({ ...prev, project_ref: undefined }));
      setFileInfo((prev) => ({ ...prev, project_ref: undefined }));

      try {
        const content = await readFileAsText(file);
        const { valid, missing } = validateCsvHeaders(content);
        if (!valid) {
          const errMsg = `Missing required columns: ${missing.join(', ')}`;
          setFileErrors((prev) => ({ ...prev, project_ref: errMsg }));
          setFileInfo((prev) => ({
            ...prev,
            project_ref: { valid: false, filename: file.name, error: errMsg },
          }));
          setField('project_ref_file', null);
          return;
        }
        const rowCount = countDataRows(content);
        setFileInfo((prev) => ({
          ...prev,
          project_ref: { valid: true, filename: file.name, rowCount },
        }));
        setField('project_ref_file', file);
      } catch {
        const errMsg = 'Could not read file';
        setFileErrors((prev) => ({ ...prev, project_ref: errMsg }));
        setField('project_ref_file', null);
      }
    },
    [setField]
  );

  // ------------------------------------------------------------------
  // handleHumanPlanUpload
  // ------------------------------------------------------------------
  const handleHumanPlanUpload = useCallback(
    async (file: File) => {
      setFileErrors((prev) => ({ ...prev, human_plan: undefined }));
      setFileInfo((prev) => ({ ...prev, human_plan: undefined }));

      try {
        const content = await readFileAsText(file);
        const { valid, missing } = validateCsvHeaders(content);
        if (!valid) {
          const errMsg = `Missing required columns: ${missing.join(', ')}`;
          setFileErrors((prev) => ({ ...prev, human_plan: errMsg }));
          setFileInfo((prev) => ({
            ...prev,
            human_plan: { valid: false, filename: file.name, error: errMsg },
          }));
          setField('human_plan_file', null);
          return;
        }
        const rowCount = countDataRows(content);
        setFileInfo((prev) => ({
          ...prev,
          human_plan: { valid: true, filename: file.name, rowCount },
        }));
        setField('human_plan_file', file);

        // Persist all rows to sessionStorage for downstream pages (US4 / FR-023)
        const rows = parseAllRows(content);
        saveHumanPlanState(projectId, rows as unknown as CapacityPlanRow[]);
      } catch {
        const errMsg = 'Could not read file';
        setFileErrors((prev) => ({ ...prev, human_plan: errMsg }));
        setField('human_plan_file', null);
      }
    },
    [projectId, setField]
  );

  // ------------------------------------------------------------------
  // handleSubmit
  // ------------------------------------------------------------------
  const handleSubmit = useCallback(async (): Promise<SaveProjectDetailsResponse | null> => {
    if (!isValid) return null;
    setIsSaving(true);

    try {
      const body = new FormData();
      body.append('project_type', formValues.project_type);
      body.append('project_name', formValues.project_name.trim());
      body.append('start_date', formValues.start_date.trim());
      body.append('end_date', formValues.end_date.trim());
      body.append('hull_length', formValues.hull_length.trim());
      body.append('hull_width', formValues.hull_width.trim());
      body.append('hull_height', formValues.hull_height.trim());
      body.append('topside_weight', formValues.topside_weight.trim());
      body.append('preferred_location', formValues.preferred_location.trim());
      body.append('preferred_yard', formValues.preferred_yard.trim());
      body.append('processes', JSON.stringify(formValues.processes));
      body.append('block_breakdown', formValues.block_breakdown.trim());
      body.append('project_ref', formValues.project_ref_file!);
      body.append('human_plan', formValues.human_plan_file!);

      const result = await saveProjectDetails(projectId, body);
      return result;
    } finally {
      setIsSaving(false);
    }
  }, [isValid, formValues, projectId]);

  return {
    formValues,
    setField,
    isValid,
    isSaving,
    fileErrors,
    fileInfo,
    handleRefFileUpload,
    handleHumanPlanUpload,
    handleSubmit,
  };
}
