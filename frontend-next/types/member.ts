import type { AuthUser, UserRole } from "./auth";

export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";

export type Member = AuthUser;

export interface Invitation {
  id: string;
  company_id: string;
  email: string;
  role: UserRole;
  invited_by_user_id: string;
  status: InvitationStatus;
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
}

export interface InvitationCreateRequest {
  email: string;
  role: UserRole;
}

export interface InvitationCreateResponse extends Invitation {
  acceptance_url: string;
}

export interface InvitationAcceptRequest {
  full_name: string;
  password: string;
}

export interface InvitationAcceptResponse {
  ok: true;
  invitation: Invitation;
}
