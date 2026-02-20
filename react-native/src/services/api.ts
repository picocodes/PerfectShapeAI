import { getFirebaseAuth } from "./firebase";

const API_BASE_URL = process.env.API_BASE_URL ?? "";

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getFirebaseAuth().currentUser?.getIdToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {})
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || "Request failed");
  }

  return (await response.json()) as T;
}
