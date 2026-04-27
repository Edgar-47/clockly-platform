import { api } from "@/lib/api-client";
import type { AuthUser, UserRole } from "@/types/auth";
import type {
  Invitation,
  InvitationAcceptRequest,
  InvitationAcceptResponse,
  InvitationCreateRequest,
  InvitationCreateResponse,
  Member,
} from "@/types/member";

export const membersService = {
  listMembers: (businessId: string) =>
    api.get<{ items: AuthUser[] }>(`/businesses/${businessId}/members`).then((r) => r.items as Member[]),

  listInvitations: (businessId: string) =>
    api.get<{ items: Invitation[] }>(`/businesses/${businessId}/invitations`).then((r) => r.items),

  createInvitation: (businessId: string, payload: InvitationCreateRequest) =>
    api.post<InvitationCreateResponse>(`/businesses/${businessId}/invitations`, payload),

  revokeInvitation: (businessId: string, invitationId: string) =>
    api.delete<Invitation>(`/businesses/${businessId}/invitations/${invitationId}`),

  changeRole: (businessId: string, userId: string, role: UserRole) =>
    api.post<Member>(`/businesses/${businessId}/members/${userId}/role`, { role }),

  revokeMember: (businessId: string, userId: string) =>
    api.delete<Member>(`/businesses/${businessId}/members/${userId}`),

  acceptInvitation: (token: string, payload: InvitationAcceptRequest) =>
    api.post<InvitationAcceptResponse>(`/invitations/${token}/accept`, payload),
};
