"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { HttpError } from "@/lib/api-client";
import { authService } from "@/services/auth.service";
import { ADMIN_ROLES, isAdminRole } from "@/types/auth";
import type { LoginRequest, RegisterCompanyRequest, UserRole } from "@/types/auth";

const EMPLOYEE_ROLES: UserRole[] = ["employee"];

export const authKeys = {
  me: ["auth", "me"] as const,
};

export function useSession() {
  const query = useQuery({
    queryKey: authKeys.me,
    queryFn: authService.me,
    retry: false,
    staleTime: 60_000,
  });

  const error = query.error as HttpError | null;
  const status =
    query.isLoading
      ? "loading"
      : query.data
        ? "authenticated"
        : error?.status === 401
          ? "unauthenticated"
          : "error";

  return {
    ...query,
    error,
    status,
  };
}

export function useMe() {
  return useSession();
}

export function useRole(): {
  role: UserRole | undefined;
  isSuperadmin: boolean;
  isAdmin: boolean;
  isEmployee: boolean;
  isLoading: boolean;
} {
  const { data, isLoading } = useSession();
  const role = data?.user.role;
  return {
    role,
    isSuperadmin: role === "superadmin",
    isAdmin: role !== undefined && isAdminRole(role),
    isEmployee: role === "employee",
    isLoading,
  };
}

export function useLogin() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  return useMutation({
    mutationFn: (payload: LoginRequest) => authService.login(payload),
    onSuccess: (session) => {
      queryClient.setQueryData(authKeys.me, session);
      const next = searchParams.get("next");
      const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
      const defaultRoute =
        session.user.role === "superadmin"
          ? "/access-unavailable"
          : session.user.role === "employee"
            ? "/employee"
            : "/dashboard";
      router.push(safeNext ?? defaultRoute);
    },
  });
}

export function useRegisterCompany() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (payload: RegisterCompanyRequest) => authService.registerCompany(payload),
    onSuccess: (session) => {
      queryClient.setQueryData(authKeys.me, session);
      router.push("/onboarding");
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: authService.logout,
    onSettled: () => {
      queryClient.clear();
      router.replace("/login");
    },
  });
}

export function useAdminSession() {
  return useRoleGuard({
    allow: ADMIN_ROLES,
    unauthorizedRedirect: "/employee",
  });
}

export function useEmployeeSession() {
  return useRoleGuard({
    allow: EMPLOYEE_ROLES,
    unauthorizedRedirect: "/dashboard",
  });
}

function useRoleGuard({
  allow,
  unauthorizedRedirect,
}: {
  allow: UserRole[];
  unauthorizedRedirect: string;
}) {
  const router = useRouter();
  const session = useSession();

  useEffect(() => {
    if (session.isLoading) return;
    if (session.error?.status === 401 || session.status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    const role = session.data?.user.role;
    if (role && !allow.includes(role)) {
      // Superadmin is reserved for a future internal console, not tenant admin UI.
      router.replace(role === "superadmin" ? "/access-unavailable" : unauthorizedRedirect);
    }
  }, [
    allow,
    router,
    session.data,
    session.error,
    session.isLoading,
    session.status,
    unauthorizedRedirect,
  ]);

  return session;
}
