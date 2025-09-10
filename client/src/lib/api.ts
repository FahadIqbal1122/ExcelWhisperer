import { apiRequest } from "./queryClient";

export interface UploadResponse {
  uploadId: string;
  sheets: Array<{
    name: string;
    rowCount: number;
    columnCount: number;
    columns: Array<{
      name: string;
      type: string;
      index: number;
    }>;
    preview: Array<Record<string, any>>;
  }>;
  filename: string;
}

export interface CodeGenerationResponse {
  code: string;
  confidence: 'high' | 'medium' | 'low';
  parameters: Array<{
    name: string;
    type: string;
    defaultValue: any;
    description?: string;
  }>;
  explanation: string;
}

export interface ExecutionResponse {
  runId: string;
  success: boolean;
  summary?: {
    originalRowCount: number;
    resultRowCount: number;
    rowsAffected: number;
    preview: Array<Record<string, any>>;
  };
  error?: string;
  downloadUrl?: string;
}

export async function uploadFile(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Upload failed');
  }

  return await response.json();
}

export async function generateCode(
  uploadId: string,
  sheetName: string,
  nlInstruction: string
): Promise<CodeGenerationResponse> {
  const response = await apiRequest("POST", "/api/generate-code", {
    uploadId,
    sheetName,
    nlInstruction,
  });

  return await response.json();
}

export async function executeCode(
  uploadId: string,
  sheetName: string,
  code: string,
  parameters: Record<string, any>,
  nlInstruction: string
): Promise<ExecutionResponse> {
  const response = await apiRequest("POST", "/api/run", {
    uploadId,
    sheetName,
    code,
    parameters,
    nlInstruction,
  });

  return await response.json();
}

export async function downloadResults(runId: string, format: 'xlsx' | 'csv' = 'xlsx'): Promise<Blob> {
  const response = await fetch(`/api/download/${runId}?format=${format}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Download failed');
  }

  return await response.blob();
}

export async function savePlaybook(data: {
  name: string;
  description?: string;
  nlInstruction: string;
  generatedCode: string;
  parameters: Array<{
    name: string;
    type: string;
    defaultValue: any;
    description?: string;
  }>;
}): Promise<any> {
  const response = await apiRequest("POST", "/api/playbooks", data);
  return await response.json();
}

export async function getPlaybooks(): Promise<any[]> {
  const response = await apiRequest("GET", "/api/playbooks", undefined);
  return await response.json();
}

export async function runPlaybook(
  playbookId: string,
  uploadId: string,
  sheetName: string,
  parameterMapping: Record<string, any>
): Promise<ExecutionResponse> {
  const response = await apiRequest("POST", `/api/playbooks/${playbookId}/run`, {
    uploadId,
    sheetName,
    parameterMapping,
  });

  return await response.json();
}
