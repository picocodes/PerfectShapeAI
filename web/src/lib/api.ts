import { getFirebaseAuth } from "./firebase";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const auth = getFirebaseAuth();
  const token = await auth.currentUser?.getIdToken();

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {})
    }
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || "Request failed");
  }

  return (await res.json()) as T;
}
