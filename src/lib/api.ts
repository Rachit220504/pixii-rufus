import type { QueryResult, SearchRequest } from "@/types/index";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export async function searchProducts(request: SearchRequest): Promise<{
  success: boolean;
  data: QueryResult;
  error?: string;
}> {
  const response = await fetch(`${API_BASE_URL}/search`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(request),
  });

  return response.json();
}

// Cache management
export async function getCacheStats(): Promise<{
  success: boolean;
  data: {
    size: number;
    entries: string[];
  };
  error?: string;
}> {
  const response = await fetch(`${API_BASE_URL}/cache/stats`, {
    headers: getAuthHeaders(),
  });
  return response.json();
}

export async function clearCache(): Promise<{
  success: boolean;
  message: string;
  error?: string;
}> {
  const response = await fetch(`${API_BASE_URL}/cache/clear`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  return response.json();
}

export async function chatWithAssistant(query: string, previousContext?: QueryResult): Promise<{
  success: boolean;
  data?: {
    response: string;
    recommendations?: QueryResult;
  };
  error?: string;
}> {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ query, previousContext }),
  });

  return response.json();
}

export async function checkHealth(): Promise<{
  success: boolean;
  message: string;
  timestamp: string;
}> {
  const response = await fetch(`${API_BASE_URL}/health`);
  return response.json();
}
