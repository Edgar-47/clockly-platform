import { api } from "@/lib/api-client";
import type { AuthPayload, LoginRequest, MePayload } from "@/types/auth";

export const authService = {
  login: (payload: LoginRequest) =>
    api.post<AuthPayload>("/auth/login", {
      identifier: payload.identifier,
      password: payload.password,
    }),

  logout: () => api.post<{ ok: true }>("/auth/logout"),

  me: () => api.get<MePayload>("/auth/me"),

  refresh: () => api.post<AuthPayload>("/auth/refresh"),
};
