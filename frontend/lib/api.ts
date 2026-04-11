export async function fetchWithAuth(url: string, options?: RequestInit) {
  return fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
}
