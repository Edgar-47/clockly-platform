import { api } from "@/lib/api-client";
import type { AuthPayload, LoginRequest } from "@/types/auth";

export const authService = {
  login: (payload: LoginRequest) =>
    api.post<AuthPayload>("/auth/login", payload),

  logout: () => api.post<{ ok: boolean }>("/auth/logout"),

  me: () => api.get<AuthPayload>("/auth/me"),
};
