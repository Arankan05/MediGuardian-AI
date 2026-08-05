/**
 * MediGuardian AI — Frontend API Client
 * Connects Next.js frontend to FastAPI backend APIs.
 */

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export type Patient = {
  name: string;
  document_count: number;
  visit_dates: string[];
};

export type UploadResult = {
  id: number;
  filename: string;
  type: string;
  category: string;
  is_scanned: boolean;
  text_length: number;
  status: "Success" | "Failed";
  error?: string;
};

export type UploadResponse = {
  message: string;
  results: UploadResult[];
};

export type ExtractionResponse = {
  message: string;
  record_id: number;
  patient_name?: string;
  medications_found?: number;
  lab_results_found?: number;
  confidence_score?: number;
};

export type HealthStatus = {
  status: string;
  database: string;
  groq: string;
  model: string;
};

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
      else if (body?.message) detail = body.message;
    } catch {
      /* response wasn't JSON — keep generic message */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export async function fetchHealth(): Promise<HealthStatus> {
  const res = await fetch(`${API_URL}/health`, { cache: "no-store" });
  return handleResponse<HealthStatus>(res);
}

export async function fetchPatients(): Promise<{ count: number; patients: Patient[] }> {
  const res = await fetch(`${API_URL}/patients`, { cache: "no-store" });
  return handleResponse<{ count: number; patients: Patient[] }>(res);
}

export async function fetchTimeline(patient?: string): Promise<any[]> {
  const endpoint = patient ? `/timeline/${encodeURIComponent(patient)}` : "/timeline";
  const res = await fetch(`${API_URL}${endpoint}`, { cache: "no-store" });
  return handleResponse<any[]>(res);
}

export async function fetchSafety(patient?: string): Promise<any> {
  const endpoint = patient ? `/safety-analysis/${encodeURIComponent(patient)}` : "/safety-analysis";
  const res = await fetch(`${API_URL}${endpoint}`, { cache: "no-store" });
  return handleResponse<any>(res);
}

export async function fetchLabTrends(patient?: string): Promise<any[]> {
  const endpoint = patient ? `/lab-trends/${encodeURIComponent(patient)}` : "/lab-trends";
  const res = await fetch(`${API_URL}${endpoint}`, { cache: "no-store" });
  return handleResponse<any[]>(res);
}

export async function fetchMedicalRecords(skip = 0, limit = 100): Promise<any[]> {
  const res = await fetch(`${API_URL}/medical-records?skip=${skip}&limit=${limit}`, { cache: "no-store" });
  return handleResponse<any[]>(res);
}

export async function fetchMedicalRecord(id: number): Promise<any> {
  const res = await fetch(`${API_URL}/medical-records/${id}`, { cache: "no-store" });
  return handleResponse<any>(res);
}

export async function uploadDocuments(files: File[]): Promise<UploadResponse> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const res = await fetch(`${API_URL}/upload`, {
    method: "POST",
    body: formData,
  });
  return handleResponse<UploadResponse>(res);
}

export async function extractAiData(documentId: number): Promise<ExtractionResponse> {
  const res = await fetch(`${API_URL}/ai/extract/${documentId}`, {
    method: "POST",
  });
  return handleResponse<ExtractionResponse>(res);
}

export async function askAssistant(question: string, patient?: string): Promise<{
  answer: string;
  patient_name?: string;
  supporting_documents?: string[];
  confidence_score?: number;
  medical_disclaimer?: string;
  follow_up_suggestions?: string[];
}> {
  const endpoint = patient ? `/chat/${encodeURIComponent(patient)}` : "/chat";
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  return handleResponse(res);
}

export async function fetchAiSummary(patient?: string): Promise<{
  patient_name: string;
  executive_summary: string;
  key_diagnoses: string[];
  active_medications_summary: Array<{ name: string; dosage_notes: string; status: string }>;
  lab_overview: Array<{ test_name: string; latest_finding: string; status: string }>;
  clinical_recommendations: string[];
  confidence_score: number;
  medical_disclaimer: string;
}> {
  const endpoint = patient ? `/ai/summary/${encodeURIComponent(patient)}` : "/ai/summary";
  const res = await fetch(`${API_URL}${endpoint}`, { cache: "no-store" });
  return handleResponse(res);
}

export async function updateMedicalRecord(id: number, data: any): Promise<{ message: string; record: any }> {
  const res = await fetch(`${API_URL}/medical-records/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<{ message: string; record: any }>(res);
}

export async function deleteMedicalRecord(id: number): Promise<{ message: string }> {
  const res = await fetch(`${API_URL}/medical-records/${id}`, {
    method: "DELETE",
  });
  return handleResponse<{ message: string }>(res);
}

export async function clearAllRecords(): Promise<{ message: string }> {
  const res = await fetch(`${API_URL}/records`, {
    method: "DELETE",
  });
  return handleResponse<{ message: string }>(res);
}

/**
 * Resolves active patient name from backend records.
 */
export async function resolveActivePatient(): Promise<string | undefined> {
  try {
    const { patients } = await fetchPatients();
    const named = patients.find((p) => p.name && p.name !== "Unknown Patient");
    return (named ?? patients[0])?.name;
  } catch {
    return undefined;
  }
}

