export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
}

export interface Session {
  token: string;
  userId: number;
  expiresAt: string;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}
