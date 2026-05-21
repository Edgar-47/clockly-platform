import type { AuthUser } from "./auth";

export type BoardNoteStatus = "pending" | "in_progress" | "completed" | "archived";
export type BoardNotePriority = "low" | "medium" | "high" | "urgent";
export type BoardLabelColor =
  | "blue"
  | "green"
  | "orange"
  | "red"
  | "purple"
  | "pink"
  | "gray"
  | "yellow"
  | "cyan";

export const BOARD_LABEL_COLORS: BoardLabelColor[] = [
  "blue",
  "green",
  "orange",
  "red",
  "purple",
  "pink",
  "gray",
  "yellow",
  "cyan",
];

export interface BoardLabel {
  id: string;
  company_id: string;
  name: string;
  color: BoardLabelColor;
  description: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface BoardNote {
  id: string;
  company_id: string;
  title: string;
  content: string | null;
  status: BoardNoteStatus;
  priority: BoardNotePriority;
  reminder_at: string | null;
  completed_at: string | null;
  archived_at: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  author: Pick<AuthUser, "id" | "full_name" | "email"> | null;
  labels: BoardLabel[];
}

export interface BoardNoteListResponse {
  items: BoardNote[];
  total: number;
  limit: number;
  offset: number;
}

export interface BoardLabelListResponse {
  items: BoardLabel[];
  total: number;
}

export interface BoardNoteFilters {
  status?: BoardNoteStatus;
  priority?: BoardNotePriority;
  label_id?: string;
  search?: string;
  include_archived?: boolean;
  limit?: number;
  offset?: number;
}

export interface BoardNoteCreateRequest {
  title: string;
  content?: string | null;
  status?: BoardNoteStatus;
  priority?: BoardNotePriority;
  label_ids?: string[];
  reminder_at?: string | null;
}

export type BoardNoteUpdateRequest = Partial<BoardNoteCreateRequest>;

export interface BoardLabelCreateRequest {
  name: string;
  color: BoardLabelColor;
  description?: string | null;
}

export type BoardLabelUpdateRequest = Partial<BoardLabelCreateRequest>;
