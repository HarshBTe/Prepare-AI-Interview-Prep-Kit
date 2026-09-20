import api from "./api";

export interface AuthUser {
  id: string;
  email: string;
  createdAt?: string;
}

export interface AuthResponse {
  success: boolean;
  user: AuthUser;
}

export async function register(
  email: string,
  password: string
): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>(
    "/api/auth/register",
    {
      email,
      password,
    }
  );

  return response.data;
}

export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>(
    "/api/auth/login",
    {
      email,
      password,
    }
  );

  return response.data;
}

export async function logout(): Promise<void> {
  await api.post("/api/auth/logout");
}

export async function getCurrentUser(): Promise<AuthUser> {
  const response = await api.get<{
    success: boolean;
    user: AuthUser;
  }>("/api/auth/me");

  return response.data.user;
}