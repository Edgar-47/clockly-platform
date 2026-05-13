import { api } from "@/lib/api-client";
import type {
  AuthPayload,
  LoginRequest,
  MePayload,
  MessageResponse,
  PasswordResetConfirmRequest,
  PasswordResetRequest,
  RegisterCompanyRequest,
} from "@/types/auth";

export const authService = {
  login: (payload: LoginRequest) =>
    api.post<AuthPayload>("/auth/login", {
      identifier: payload.identifier,
      password: payload.password,
    }),

  registerCompany: (payload: RegisterCompanyRequest) =>
    api.post<AuthPayload>("/auth/register-company", payload),

  logout: () => api.post<{ ok: true }>("/auth/logout"),

  me: () => api.get<MePayload>("/auth/me"),

  refresh: () => api.post<AuthPayload>("/auth/refresh"),

  requestPasswordReset: (payload: PasswordResetRequest) =>
    api.post<MessageResponse>("/auth/request-password-reset", payload),

  resetPassword: (payload: PasswordResetConfirmRequest) =>
    api.post<MessageResponse>("/auth/reset-password", payload),
};
