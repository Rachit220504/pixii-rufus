import { User } from "../types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    user: User;
    session?: {
      token: string;
      userId: number;
      expiresAt: string;
    };
  };
  error?: string;
}

export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.success && data.data?.session?.token) {
    localStorage.setItem("auth_token", data.data.session.token);
    localStorage.setItem("user", JSON.stringify(data.data.user));
  }

  return data;
}

export async function googleLogin(idToken: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/google`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ idToken }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.success && data.data?.session?.token) {
    localStorage.setItem("auth_token", data.data.session.token);
    localStorage.setItem("user", JSON.stringify(data.data.user));
  }

  return data;
}

export async function register(credentials: RegisterCredentials): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      error: data.error || `Registration failed (${response.status})`,
    };
  }

  return data;
}

export async function logout(): Promise<void> {
  const token = localStorage.getItem("auth_token");
  
  if (token) {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });
  }

  localStorage.removeItem("auth_token");
  localStorage.removeItem("user");
}

export async function forgotPassword(email: string): Promise<{ success: boolean; error?: string; message?: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export async function resetPassword(token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token, newPassword }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export async function getCurrentUser(): Promise<User | null> {
  const token = localStorage.getItem("auth_token");
  const userStr = localStorage.getItem("user");

  if (!token || !userStr) {
    return null;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");
      return null;
    }

    const data = await response.json();
    
    if (data.success) {
      return data.data.user;
    } else {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");
      return null;
    }
  } catch {
    return JSON.parse(userStr);
  }
}

export function getToken(): string | null {
  return localStorage.getItem("auth_token");
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function getUserId(): string | null {
  const userStr = localStorage.getItem("user");
  if (!userStr) return null;
  
  try {
    const user = JSON.parse(userStr);
    return user.id?.toString() || user.email || null;
  } catch {
    return null;
  }
}

export function getUserName(): string | null {
  const userStr = localStorage.getItem("user");
  if (!userStr) return null;
  
  try {
    const user = JSON.parse(userStr);
    return user.firstName || user.email || null;
  } catch {
    return null;
  }
}
