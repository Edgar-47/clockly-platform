export interface AuthUser {
  id: number;
  email: string | null;
  first_name: string;
  last_name: string;
  role: "superadmin" | "admin" | "employee";
  active: boolean;
}

export interface AuthPayload {
  access_token: string;
  token_type: "bearer";
  user: AuthUser;
  active_business_id: string | null;
  active_business_role: "owner" | "admin" | "employee" | null;
  permissions: string[];
}

export interface LoginRequest {
  identifier: string;
  password: string;
}
