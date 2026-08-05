/** Single place that knows how to reach the backend. */
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export type Patient = {
  name: string;
  document_count: number;
  visit_dates: string[];
};

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { cache: "no-store" });
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      /* response wasn't JSON — keep the generic message */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export function fetchPatients() {
  return getJSON<{ count: number; patients: Patient[] }>("/patients");
}

export function fetchTimeline(patient?: string) {
  return getJSON<any[]>(patient ? `/timeline/${encodeURIComponent(patient)}` : "/timeline");
}

export function fetchSafety(patient?: string) {
  return getJSON<any>(
    patient ? `/safety-analysis/${encodeURIComponent(patient)}` : "/safety-analysis"
  );
}

export function fetchLabTrends(patient?: string) {
  return getJSON<any[]>(patient ? `/lab-trends/${encodeURIComponent(patient)}` : "/lab-trends");
}

export async function askAssistant(question: string, patient?: string) {
  const res = await fetch(
    `${API_URL}${patient ? `/chat/${encodeURIComponent(patient)}` : "/chat"}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    }
  );
  if (!res.ok) throw new Error(`Assistant request failed (${res.status})`);
  return res.json();
}

/**
 * The dashboard works across whichever patient the uploaded documents belong to.
 * We resolve that from the backend rather than assuming a name.
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
